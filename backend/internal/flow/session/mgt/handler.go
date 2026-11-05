// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package sessionmgt

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/thunder-id/thunderid/internal/application"
	flowsession "github.com/thunder-id/thunderid/internal/flow/session"
	oauth2const "github.com/thunder-id/thunderid/internal/oauth/oauth2/constants"
	serverconst "github.com/thunder-id/thunderid/internal/system/constants"
	"github.com/thunder-id/thunderid/internal/system/error/apierror"
	"github.com/thunder-id/thunderid/internal/system/log"
	"github.com/thunder-id/thunderid/internal/system/security"
	sysutils "github.com/thunder-id/thunderid/internal/system/utils"
	"github.com/thunder-id/thunderid/internal/user"
	tidcommon "github.com/thunder-id/thunderid/pkg/thunderidengine/common"
)

// sessionMgtHandler serves the session management endpoints.
type sessionMgtHandler struct {
	svc    flowsession.Service
	users  user.UserServiceInterface
	apps   application.ApplicationServiceInterface
	logger *log.Logger
}

// newSessionMgtHandler creates the session management handler.
func newSessionMgtHandler(svc flowsession.Service, users user.UserServiceInterface,
	apps application.ApplicationServiceInterface) *sessionMgtHandler {
	return &sessionMgtHandler{
		svc:    svc,
		users:  users,
		apps:   apps,
		logger: log.GetLogger().With(log.String(log.LoggerKeyComponentName, "SessionMgtHandler")),
	}
}

// HandleSessionListRequest handles GET /sessions?userId= or GET /sessions?appId=.
func (h *sessionMgtHandler) HandleSessionListRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	userID := strings.TrimSpace(query.Get("userId"))
	appID := strings.TrimSpace(query.Get("appId"))
	if (userID == "") == (appID == "") {
		handleError(ctx, w, &ErrorInvalidListFilter)
		return
	}
	limit, offset, svcErr := parsePaginationParams(query)
	if svcErr != nil {
		handleError(ctx, w, svcErr)
		return
	}
	ouID, ok := confinedOU(ctx, w, security.GetSystemPermissions().SessionView)
	if !ok {
		return
	}

	var (
		page       *flowsession.SessionPage
		err        error
		extraQuery string
	)
	now := time.Now().UTC()
	if userID != "" {
		page, err = h.svc.ListLiveBySubject(ctx, userID, ouID, now, limit, offset)
		extraQuery = "&userId=" + url.QueryEscape(userID)
	} else {
		page, err = h.svc.ListLiveByApp(ctx, appID, ouID, now, limit, offset)
		extraQuery = "&appId=" + url.QueryEscape(appID)
	}
	if err != nil {
		h.logger.Error(ctx, "Failed to list sessions", log.Error(err))
		handleError(ctx, w, &tidcommon.InternalServerError)
		return
	}

	// A session permission doesn't let the caller read users or applications, so the names are read as
	// the runtime.
	runtimeCtx := security.WithRuntimeContext(ctx)
	userNames := h.userNames(runtimeCtx, page.Sessions)
	apps := h.appDisplays(runtimeCtx, page.Sessions)
	sessions := make([]sessionResponse, 0, len(page.Sessions))
	for _, s := range page.Sessions {
		sessions = append(sessions, toSessionResponse(s, userNames, apps))
	}
	sysutils.WriteSuccessResponse(ctx, w, http.StatusOK,
		buildListResponse(sessions, page.TotalResults, "/sessions", limit, offset, extraQuery))
}

// HandleSelfSessionListRequest handles GET /users/me/sessions: the caller's own sessions, with the one
// behind the caller's access token marked as current.
func (h *sessionMgtHandler) HandleSelfSessionListRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	subject := security.GetSubject(ctx)
	if strings.TrimSpace(subject) == "" {
		sysutils.WriteErrorResponse(ctx, w, http.StatusUnauthorized, apierror.ErrUnauthorized)
		return
	}
	limit, offset, svcErr := parsePaginationParams(r.URL.Query())
	if svcErr != nil {
		handleError(ctx, w, svcErr)
		return
	}

	// A token that names an organization unit sees only the sessions with an application signed in under
	// that unit, and only those applications, so an application in one unit can't see the user's sign-ins
	// in another. A token that names no unit sees every session.
	page, err := h.svc.ListLiveBySubject(ctx, subject, security.GetOUID(ctx), time.Now().UTC(), limit, offset)
	if err != nil {
		h.logger.Error(ctx, "Failed to list own sessions", log.Error(err))
		handleError(ctx, w, &tidcommon.InternalServerError)
		return
	}

	// The caller already knows who they are, so only the applications are resolved. The caller signed
	// in to these applications but may not be allowed to read them, so they are read as the runtime.
	apps := h.appDisplays(security.WithRuntimeContext(ctx), page.Sessions)
	tokenFamilyID, _ := security.GetAttribute(ctx, oauth2const.ClaimTokenFamilyID).(string)
	sessions := make([]sessionResponse, 0, len(page.Sessions))
	for _, s := range page.Sessions {
		resp := toSessionResponse(s, nil, apps)
		isCurrent := isCurrentSession(s, tokenFamilyID)
		resp.IsCurrent = &isCurrent
		sessions = append(sessions, resp)
	}
	sysutils.WriteSuccessResponse(ctx, w, http.StatusOK,
		buildListResponse(sessions, page.TotalResults, "/users/me/sessions", limit, offset, ""))
}

// HandleSessionRevokeRequest handles DELETE /sessions/{id}. An administrator confined to an organization unit
// ends the whole session when an application signed in to it under that unit. It responds 204 even when the
// session is already gone or out of the caller's reach.
func (h *sessionMgtHandler) HandleSessionRevokeRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ouID, ok := confinedOU(ctx, w, security.GetSystemPermissions().SessionDelete)
	if !ok {
		return
	}
	if _, err := h.svc.RevokeSession(ctx, r.PathValue("id"), "", ouID); err != nil {
		h.logger.Error(ctx, "Failed to revoke session", log.Error(err))
		handleError(ctx, w, &tidcommon.InternalServerError)
		return
	}
	sysutils.WriteSuccessResponse(ctx, w, http.StatusNoContent, nil)
}

// HandleUserSessionsRevokeRequest handles DELETE /sessions?userId=: every session of the user, or for an
// administrator confined to an organization unit, every one with an application signed in under it.
func (h *sessionMgtHandler) HandleUserSessionsRevokeRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := strings.TrimSpace(r.URL.Query().Get("userId"))
	if userID == "" {
		handleError(ctx, w, &ErrorMissingUserID)
		return
	}
	ouID, ok := confinedOU(ctx, w, security.GetSystemPermissions().SessionDelete)
	if !ok {
		return
	}
	if err := h.svc.RevokeSubjectSessions(ctx, userID, ouID, ""); err != nil {
		h.logger.Error(ctx, "Failed to revoke user sessions", log.Error(err))
		handleError(ctx, w, &tidcommon.InternalServerError)
		return
	}
	sysutils.WriteSuccessResponse(ctx, w, http.StatusNoContent, nil)
}

// HandleSelfSessionRevokeRequest handles DELETE /users/me/sessions/{id}. A session that is missing, belongs
// to someone else, or has no application signed in under the organization unit the token names is a 404
// alike, so session IDs can't be probed.
func (h *sessionMgtHandler) HandleSelfSessionRevokeRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	subject := security.GetSubject(ctx)
	if strings.TrimSpace(subject) == "" {
		sysutils.WriteErrorResponse(ctx, w, http.StatusUnauthorized, apierror.ErrUnauthorized)
		return
	}
	found, err := h.svc.RevokeSession(ctx, r.PathValue("id"), subject, security.GetOUID(ctx))
	if err != nil {
		h.logger.Error(ctx, "Failed to revoke own session", log.Error(err))
		handleError(ctx, w, &tidcommon.InternalServerError)
		return
	}
	if !found {
		handleError(ctx, w, &ErrorSessionNotFound)
		return
	}
	sysutils.WriteSuccessResponse(ctx, w, http.StatusNoContent, nil)
}

// HandleSelfSessionsRevokeRequest handles DELETE /users/me/sessions: every session of the caller that its
// own list shows, or with exceptCurrent=true every one but the session the caller's access token was issued
// in.
func (h *sessionMgtHandler) HandleSelfSessionsRevokeRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	subject := security.GetSubject(ctx)
	if strings.TrimSpace(subject) == "" {
		sysutils.WriteErrorResponse(ctx, w, http.StatusUnauthorized, apierror.ErrUnauthorized)
		return
	}
	v := r.URL.Query().Get("exceptCurrent")
	if v != "" && v != "true" && v != "false" {
		handleError(ctx, w, &ErrorInvalidExceptCurrent)
		return
	}
	exceptCurrent := v == "true"
	var keepTokenFamilyID string
	if exceptCurrent {
		keepTokenFamilyID, _ = security.GetAttribute(ctx, oauth2const.ClaimTokenFamilyID).(string)
		if keepTokenFamilyID == "" {
			handleError(ctx, w, &ErrorCurrentSessionUnknown)
			return
		}
	}
	if err := h.svc.RevokeSubjectSessions(ctx, subject, security.GetOUID(ctx), keepTokenFamilyID); err != nil {
		if errors.Is(err, flowsession.ErrTokenFamilyNotInSession) {
			handleError(ctx, w, &ErrorCurrentSessionUnknown)
			return
		}
		h.logger.Error(ctx, "Failed to revoke own sessions", log.Error(err))
		handleError(ctx, w, &tidcommon.InternalServerError)
		return
	}
	sysutils.WriteSuccessResponse(ctx, w, http.StatusNoContent, nil)
}

// confinedOU returns the organization unit an administrator's session request is confined to: "" when
// its permissions reach every unit through required, or else the unit its token names. It writes 403 and
// returns false when the token names none; the security middleware refuses such a caller already.
func confinedOU(ctx context.Context, w http.ResponseWriter, required string) (string, bool) {
	if security.ReachesDeployment(security.GetPermissions(ctx), required) {
		return "", true
	}
	ouID := security.GetOUID(ctx)
	if ouID == "" {
		sysutils.WriteErrorResponse(ctx, w, http.StatusForbidden, apierror.ErrForbidden)
		return "", false
	}
	return ouID, true
}

// userNames resolves the display name of each distinct user across the sessions, once per user. A
// user that can't be found gets no name.
func (h *sessionMgtHandler) userNames(ctx context.Context, sessions []flowsession.SessionDetail) map[string]string {
	names := make(map[string]string)
	for _, s := range sessions {
		if _, seen := names[s.SubjectID]; seen {
			continue
		}
		names[s.SubjectID] = ""
		if u, svcErr := h.users.GetUser(ctx, s.SubjectID, true); svcErr == nil && u != nil {
			names[s.SubjectID] = u.Display
		}
	}
	return names
}

// appDisplays resolves the name and logo of each distinct participating application across the
// sessions, once per application. An application that can't be found gets neither.
func (h *sessionMgtHandler) appDisplays(ctx context.Context,
	sessions []flowsession.SessionDetail) map[string]appDisplay {
	apps := make(map[string]appDisplay)
	for _, s := range sessions {
		for _, p := range s.Participants {
			if _, seen := apps[p.AppID]; seen {
				continue
			}
			apps[p.AppID] = appDisplay{}
			if a, svcErr := h.apps.GetApplication(ctx, p.AppID); svcErr == nil && a != nil {
				apps[p.AppID] = appDisplay{name: a.Name, logoURL: a.LogoURL}
			}
		}
	}
	return apps
}

// isCurrentSession reports whether the session issued the caller's access token: one of its
// participants holds the token's family. A token without a family matches no session.
func isCurrentSession(s flowsession.SessionDetail, tokenFamilyID string) bool {
	if tokenFamilyID == "" {
		return false
	}
	for _, p := range s.Participants {
		if p.TokenFamilyID == tokenFamilyID {
			return true
		}
	}
	return false
}

// toSessionResponse maps a session and its participants to the API view, filling in the resolved
// names and logos. A value missing from userNames or apps is left out.
func toSessionResponse(s flowsession.SessionDetail, userNames map[string]string,
	apps map[string]appDisplay) sessionResponse {
	participants := make([]participantResponse, 0, len(s.Participants))
	for _, p := range s.Participants {
		participants = append(participants, participantResponse{
			AppID:         p.AppID,
			OUID:          p.OUID,
			AppName:       apps[p.AppID].name,
			AppLogoURL:    apps[p.AppID].logoURL,
			FirstJoinedAt: formatTime(p.FirstJoinedAt),
			LastActiveAt:  formatTime(p.LastActiveAt),
		})
	}
	return sessionResponse{
		ID:                s.SessionID,
		UserID:            s.SubjectID,
		UserName:          userNames[s.SubjectID],
		UserAgent:         s.Properties.UserAgent,
		CreationIP:        s.Properties.CreationIP,
		LastActiveIP:      s.Properties.LastActiveIP,
		AuthenticatedAt:   formatTime(s.AuthenticatedAt),
		CreatedAt:         formatTime(s.CreatedAt),
		LastActiveAt:      formatTime(s.LastActiveAt),
		IdleExpiresAt:     formatTime(s.IdleExpiresAt),
		AbsoluteExpiresAt: formatTime(s.AbsoluteExpiresAt),
		Participants:      participants,
	}
}

// buildListResponse assembles the paginated list body. basePath is the route the pagination links
// point back to, and extraQuery carries the list filter into them.
func buildListResponse(sessions []sessionResponse, total int, basePath string, limit, offset int,
	extraQuery string) *sessionListResponse {
	return &sessionListResponse{
		TotalResults: total,
		StartIndex:   offset + 1,
		Count:        len(sessions),
		Sessions:     sessions,
		Links:        sysutils.BuildPaginationLinks(basePath, limit, offset, total, extraQuery),
	}
}

// parsePaginationParams parses limit and offset. An omitted limit is the default page size; a limit
// outside 1 to the maximum page size, or a negative offset, is rejected.
func parsePaginationParams(query url.Values) (int, int, *tidcommon.ServiceError) {
	limit := serverconst.DefaultPageSize
	offset := 0

	if limitStr := query.Get("limit"); limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed < 1 || parsed > serverconst.MaxPageSize {
			return 0, 0, &ErrorInvalidLimit
		}
		limit = parsed
	}
	if offsetStr := query.Get("offset"); offsetStr != "" {
		parsed, err := strconv.Atoi(offsetStr)
		if err != nil || parsed < 0 {
			return 0, 0, &ErrorInvalidOffset
		}
		offset = parsed
	}
	return limit, offset, nil
}

// handleError writes the error response for a service error.
func handleError(ctx context.Context, w http.ResponseWriter, svcErr *tidcommon.ServiceError) {
	statusCode := http.StatusInternalServerError
	if svcErr.Type == tidcommon.ClientErrorType {
		statusCode = http.StatusBadRequest
		if svcErr.Code == ErrorSessionNotFound.Code {
			statusCode = http.StatusNotFound
		}
	}

	sysutils.WriteErrorResponse(ctx, w, statusCode, apierror.ErrorResponse{
		Code:        svcErr.Code,
		Message:     svcErr.Error,
		Description: svcErr.ErrorDescription,
	})
}

// formatTime renders a timestamp as RFC 3339 in UTC, or "" for the zero value (no deadline).
func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}
