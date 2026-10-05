// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package sso

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/thunder-id/thunderid/tests/integration/testutils"
)

// sessionView is the part of the session management API's session body these tests read.
type sessionView struct {
	ID           string `json:"id"`
	UserID       string `json:"userId"`
	UserAgent    string `json:"userAgent"`
	LastActiveIP string `json:"lastActiveIp"`
	IsCurrent    *bool  `json:"isCurrent"`
	Participants []struct {
		AppID   string `json:"appId"`
		AppName string `json:"appName"`
	} `json:"participants"`
}

type sessionListView struct {
	TotalResults int           `json:"totalResults"`
	Count        int           `json:"count"`
	Sessions     []sessionView `json:"sessions"`
	Links        []struct {
		Href string `json:"href"`
		Rel  string `json:"rel"`
	} `json:"links"`
}

// getSessions sends a GET to the session management API with the given client, decodes a 200
// response into out, and returns the status code and the raw body.
func (ts *SSOLogoutTestSuite) getSessions(client *http.Client, path string, out interface{}) (int, string) {
	ts.T().Helper()

	resp, err := client.Get(testutils.TestServerURL + path)
	ts.Require().NoError(err, "session API request failed")
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	ts.Require().NoError(err)
	if resp.StatusCode == http.StatusOK && out != nil {
		ts.Require().NoError(json.Unmarshal(body, out), "failed to decode session API response: %s", body)
	}
	return resp.StatusCode, string(body)
}

// An administrator can list a user's live sessions, with the device, the IP and the participating
// application recorded at sign-in, and the response carries no credential.
func (ts *SSOLogoutTestSuite) TestSessionAPI_AdminListsUserSessions() {
	userID := ts.createUser("sso_visibility_admin_user")
	ts.login(ts.newSessionClient(), "sso_visibility_admin_user", "visibility_admin_1")

	var list sessionListView
	status, raw := ts.getSessions(testutils.GetHTTPClient(), "/sessions?userId="+url.QueryEscape(userID), &list)

	ts.Require().Equal(http.StatusOK, status)
	ts.Require().Equal(1, list.TotalResults, "one sign-in makes one session")
	ts.Require().Len(list.Sessions, 1)
	got := list.Sessions[0]
	ts.Equal(userID, got.UserID)
	ts.NotEmpty(got.UserAgent, "the sign-in's User-Agent is recorded")
	ts.NotEmpty(got.LastActiveIP, "the sign-in's IP is recorded")
	ts.Nil(got.IsCurrent, "admin listings don't mark a current session")
	ts.Require().Len(got.Participants, 1)
	ts.Equal(ts.applicationID, got.Participants[0].AppID)
	ts.Equal(appName, got.Participants[0].AppName)
	for _, secret := range []string{"handle", "tfid", "tokenFamily", "context"} {
		ts.NotContains(strings.ToLower(raw), strings.ToLower(secret), "the response must not carry %s", secret)
	}
}

// Listing by application finds the sessions the application has joined, and paging splits them
// with the filter carried into the links.
func (ts *SSOLogoutTestSuite) TestSessionAPI_ListByApplicationPages() {
	ts.createUser("sso_visibility_app_user")
	ts.login(ts.newSessionClient(), "sso_visibility_app_user", "visibility_app_1")
	ts.login(ts.newSessionClient(), "sso_visibility_app_user", "visibility_app_2")

	var list sessionListView
	status, _ := ts.getSessions(testutils.GetHTTPClient(),
		"/sessions?appId="+url.QueryEscape(ts.applicationID)+"&limit=1", &list)

	ts.Require().Equal(http.StatusOK, status)
	ts.GreaterOrEqual(list.TotalResults, 2, "both sign-ins joined the application")
	ts.Equal(1, list.Count, "limit caps the page")
	ts.Require().Len(list.Sessions, 1)
	ts.Require().Len(list.Sessions[0].Participants, 1)
	ts.Equal(ts.applicationID, list.Sessions[0].Participants[0].AppID)
	var next string
	for _, l := range list.Links {
		if l.Rel == "next" {
			next = l.Href
		}
	}
	ts.Contains(next, "appId="+url.QueryEscape(ts.applicationID), "the next link keeps the filter")
}

// A signed-in user lists only their own sessions with GET /sessions/me, and the session that issued
// the access token is marked as current.
func (ts *SSOLogoutTestSuite) TestSessionAPI_SelfListMarksCurrentSession() {
	userID := ts.createUser("sso_visibility_self_user")
	ts.login(ts.newSessionClient(), "sso_visibility_self_user", "visibility_self_1")
	tokens := ts.loginTokens(ts.newSessionClient(), "sso_visibility_self_user", "visibility_self_2")

	var list sessionListView
	status, _ := ts.getSessions(testutils.GetHTTPClientWithToken(tokens.AccessToken),
		"/sessions/me?userId=someone-else", &list)

	ts.Require().Equal(http.StatusOK, status)
	ts.Require().Equal(2, list.TotalResults, "each browser holds its own session")
	current := 0
	for _, s := range list.Sessions {
		ts.Equal(userID, s.UserID, "a userId parameter can't widen /sessions/me")
		ts.Require().NotNil(s.IsCurrent, "own sessions always say whether they are current")
		if *s.IsCurrent {
			current++
		}
	}
	ts.Equal(1, current, "exactly the session behind the token is current")
}

// A session that has been signed out no longer appears in either listing.
func (ts *SSOLogoutTestSuite) TestSessionAPI_SignedOutSessionIsNotListed() {
	userID := ts.createUser("sso_visibility_signout_user")
	client := ts.newSessionClient()
	idToken := ts.login(client, "sso_visibility_signout_user", "visibility_signout_1")
	tokens := ts.loginTokens(ts.newSessionClient(), "sso_visibility_signout_user", "visibility_signout_2")
	path := "/sessions?userId=" + url.QueryEscape(userID)

	var before sessionListView
	status, _ := ts.getSessions(testutils.GetHTTPClient(), path, &before)
	ts.Require().Equal(http.StatusOK, status)
	ts.Require().Equal(2, before.TotalResults)

	executionID, _ := ts.initiateLogout(client, idToken, postLogoutRedirectURI, "visibility_signout_3")
	step := ts.flowExecute(client, map[string]interface{}{"executionId": executionID})
	ts.Require().Equal("COMPLETE", step.FlowStatus, "the sign-out flow should complete")

	var after sessionListView
	status, _ = ts.getSessions(testutils.GetHTTPClient(), path, &after)
	ts.Require().Equal(http.StatusOK, status)
	ts.Equal(1, after.TotalResults, "the signed-out session is gone from the admin list")
	ts.Len(after.Sessions, 1)

	var mine sessionListView
	status, _ = ts.getSessions(testutils.GetHTTPClientWithToken(tokens.AccessToken), "/sessions/me", &mine)
	ts.Require().Equal(http.StatusOK, status)
	ts.Equal(1, mine.TotalResults, "the signed-out session is gone from the user's own list")
}

// A session left idle past its timeout is still in the table until cleanup, but no longer appears in
// either listing, because the queries apply the liveness rule in SQL.
func (ts *SSOLogoutTestSuite) TestSessionAPI_IdleExpiredSessionIsNotListed() {
	// A generous absolute timeout isolates the idle deadline as the only thing that can expire.
	ts.applySessionTimeouts(2, 600, 1)
	userID := ts.createUser("sso_visibility_idle_user")
	tokens := ts.loginTokens(ts.newSessionClient(), "sso_visibility_idle_user", "visibility_idle_1")
	path := "/sessions?userId=" + url.QueryEscape(userID)

	var before sessionListView
	status, _ := ts.getSessions(testutils.GetHTTPClient(), path, &before)
	ts.Require().Equal(http.StatusOK, status)
	ts.Require().Equal(1, before.TotalResults, "the session is listed while it is live")

	// Idle past the deadline with no activity at all.
	time.Sleep(4 * time.Second)

	var after sessionListView
	status, _ = ts.getSessions(testutils.GetHTTPClient(), path, &after)
	ts.Require().Equal(http.StatusOK, status)
	ts.Equal(0, after.TotalResults, "the idle-expired session is gone from the admin list")
	ts.Empty(after.Sessions)

	var mine sessionListView
	status, _ = ts.getSessions(testutils.GetHTTPClientWithToken(tokens.AccessToken), "/sessions/me", &mine)
	ts.Require().Equal(http.StatusOK, status)
	ts.Equal(0, mine.TotalResults, "the idle-expired session is gone from the user's own list")
}

// Listing another user's sessions needs the system permission, which a regular user lacks.
func (ts *SSOLogoutTestSuite) TestSessionAPI_RegularUserCannotListOthers() {
	userID := ts.createUser("sso_visibility_forbidden_user")
	tokens := ts.loginTokens(ts.newSessionClient(), "sso_visibility_forbidden_user", "visibility_forbidden_1")

	status, _ := ts.getSessions(testutils.GetHTTPClientWithToken(tokens.AccessToken),
		"/sessions?userId="+url.QueryEscape(userID), nil)

	ts.Equal(http.StatusForbidden, status)
}

// Both listings need an access token.
func (ts *SSOLogoutTestSuite) TestSessionAPI_RequiresAuthentication() {
	for _, path := range []string{"/sessions?userId=any", "/sessions/me"} {
		status, _ := ts.getSessions(testutils.GetRawHTTPClient(), path, nil)
		ts.Equal(http.StatusUnauthorized, status, path)
	}
}

// The admin list needs exactly one filter.
func (ts *SSOLogoutTestSuite) TestSessionAPI_ListNeedsOneFilter() {
	for _, path := range []string{"/sessions", "/sessions?userId=a&appId=b"} {
		status, _ := ts.getSessions(testutils.GetHTTPClient(), path, nil)
		ts.Equal(http.StatusBadRequest, status, path)
	}
}
