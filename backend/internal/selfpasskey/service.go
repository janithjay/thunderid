// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// Package selfpasskey lets a signed-in user add, list and remove their own passkeys.
package selfpasskey

import (
	"context"
	"errors"
	"strings"

	tidcommon "github.com/thunder-id/thunderid/pkg/thunderidengine/common"

	"github.com/thunder-id/thunderid/internal/authn/passkey"
	"github.com/thunder-id/thunderid/internal/flow/executormeta"
	flowmgt "github.com/thunder-id/thunderid/internal/flow/mgt"
	"github.com/thunder-id/thunderid/internal/inboundclient"
	"github.com/thunder-id/thunderid/internal/system/config"
	"github.com/thunder-id/thunderid/internal/system/log"
	"github.com/thunder-id/thunderid/internal/system/security"
)

// The properties of a passkey step that name the relying party its passkeys belong to.
const (
	propertyRelyingPartyID   = "relyingPartyId"
	propertyRelyingPartyName = "relyingPartyName"
)

// selfPasskeyServiceInterface manages the passkeys of the signed-in user.
type selfPasskeyServiceInterface interface {
	StartRegistration(ctx context.Context, userID, clientID string) (
		*passkey.PasskeyRegistrationStartData, *tidcommon.ServiceError)
	FinishRegistration(ctx context.Context, userID, clientID string, req *registrationFinishRequest) (
		*passkey.PasskeyInfo, *tidcommon.ServiceError)
	ListPasskeys(ctx context.Context, userID, clientID string) (*passkeyListResponse, *tidcommon.ServiceError)
	DeletePasskey(ctx context.Context, userID, passkeyID string) *tidcommon.ServiceError
}

// appPasskeyConfig holds the passkey settings that apply to the caller's app.
type appPasskeyConfig struct {
	origins          []string
	relyingPartyID   string
	relyingPartyName string
}

// selfPasskeyService is the default implementation of selfPasskeyServiceInterface.
type selfPasskeyService struct {
	passkeyService       passkey.PasskeyServiceInterface
	inboundClientService inboundclient.InboundClientServiceInterface
	flowMgtService       flowmgt.FlowMgtServiceInterface
	logger               *log.Logger
}

// newSelfPasskeyService creates a new self-service passkey service.
func newSelfPasskeyService(
	passkeyService passkey.PasskeyServiceInterface,
	inboundClientService inboundclient.InboundClientServiceInterface,
	flowMgtService flowmgt.FlowMgtServiceInterface,
) selfPasskeyServiceInterface {
	return &selfPasskeyService{
		passkeyService:       passkeyService,
		inboundClientService: inboundClientService,
		flowMgtService:       flowMgtService,
		logger:               log.GetLogger().With(log.String(log.LoggerKeyComponentName, "SelfPasskeyService")),
	}
}

// StartRegistration starts adding a passkey for the user. The passkey belongs to the relying party of the
// passkey step in the sign-in flow of the token's app, so the passkey signs the user in there.
func (s *selfPasskeyService) StartRegistration(ctx context.Context, userID, clientID string) (
	*passkey.PasskeyRegistrationStartData, *tidcommon.ServiceError) {
	cfg, svcErr := s.passkeyConfig(ctx, clientID)
	if svcErr != nil {
		return nil, svcErr
	}
	if cfg.relyingPartyID == "" {
		return nil, &ErrorPasskeySignInNotConfigured
	}

	return s.passkeyService.StartRegistration(ctx, &passkey.PasskeyRegistrationStartRequest{
		UserID:           userID,
		RelyingPartyID:   cfg.relyingPartyID,
		RelyingPartyName: cfg.relyingPartyName,
		AllowedOrigins:   cfg.origins,
	})
}

// FinishRegistration verifies and saves the passkey the user's device created.
func (s *selfPasskeyService) FinishRegistration(ctx context.Context, userID, clientID string,
	req *registrationFinishRequest) (*passkey.PasskeyInfo, *tidcommon.ServiceError) {
	cfg, svcErr := s.passkeyConfig(ctx, clientID)
	if svcErr != nil {
		return nil, svcErr
	}

	name := strings.TrimSpace(req.Name)
	if _, svcErr := s.passkeyService.FinishRegistration(ctx, &passkey.PasskeyRegistrationFinishRequest{
		CredentialID:      req.PublicKeyCredential.ID,
		CredentialType:    req.PublicKeyCredential.Type,
		ClientDataJSON:    req.PublicKeyCredential.Response.ClientDataJSON,
		AttestationObject: req.PublicKeyCredential.Response.AttestationObject,
		SessionToken:      req.SessionToken,
		AllowedOrigins:    cfg.origins,
		UserID:            userID,
		Name:              name,
	}); svcErr != nil {
		return nil, svcErr
	}

	return &passkey.PasskeyInfo{ID: req.PublicKeyCredential.ID, Name: name}, nil
}

// ListPasskeys returns the user's passkeys, with the relying party they belong to for the token's app, so a
// client can tell the device's passkey provider about one it removes.
func (s *selfPasskeyService) ListPasskeys(ctx context.Context, userID, clientID string) (
	*passkeyListResponse, *tidcommon.ServiceError) {
	cfg, svcErr := s.passkeyConfig(ctx, clientID)
	if svcErr != nil {
		return nil, svcErr
	}
	passkeys, svcErr := s.passkeyService.ListPasskeys(ctx, userID)
	if svcErr != nil {
		return nil, svcErr
	}
	return &passkeyListResponse{Passkeys: passkeys, RelyingPartyID: cfg.relyingPartyID}, nil
}

// DeletePasskey removes one of the user's passkeys.
func (s *selfPasskeyService) DeletePasskey(ctx context.Context, userID, passkeyID string) *tidcommon.ServiceError {
	return s.passkeyService.DeletePasskey(ctx, userID, passkeyID)
}

// passkeyConfig returns the passkey settings of the app the token was issued to: its passkey origins, and
// the relying party of the passkey step in its sign-in flow. The origins fall back to the server's passkey
// origins when the app sets none.
func (s *selfPasskeyService) passkeyConfig(ctx context.Context, clientID string) (
	*appPasskeyConfig, *tidcommon.ServiceError) {
	cfg := &appPasskeyConfig{}
	if clientID != "" {
		client, err := s.inboundClientService.GetOAuthClientByClientID(ctx, clientID)
		if err != nil {
			s.logger.Error(ctx, "Failed to resolve the token's OAuth client", log.Error(err))
			return nil, &tidcommon.InternalServerError
		}
		if client != nil {
			app, err := s.inboundClientService.GetInboundClientByEntityID(ctx, client.ID)
			if err != nil && !errors.Is(err, inboundclient.ErrInboundClientNotFound) {
				s.logger.Error(ctx, "Failed to load the token's application", log.Error(err))
				return nil, &tidcommon.InternalServerError
			}
			if app != nil {
				cfg.origins = app.PasskeyAllowedOrigins
				if svcErr := s.readSignInRelyingParty(ctx, app.AuthFlowID, cfg); svcErr != nil {
					return nil, svcErr
				}
			}
		}
	}
	if len(cfg.origins) == 0 {
		cfg.origins = config.GetServerRuntime().Config.Passkey.AllowedOrigins
	}
	return cfg, nil
}

// readSignInRelyingParty sets the relying party of the first passkey step in the sign-in flow that names
// one. A flow without such a step leaves it unset.
func (s *selfPasskeyService) readSignInRelyingParty(ctx context.Context, flowID string,
	cfg *appPasskeyConfig) *tidcommon.ServiceError {
	if flowID == "" {
		return nil
	}
	// The app's sign-in flow may belong to another organization unit, such as a default flow, so it is
	// read without the caller's authorization.
	flow, svcErr := s.flowMgtService.GetFlow(security.WithRuntimeContext(ctx), flowID)
	if svcErr != nil {
		s.logger.Error(ctx, "Failed to load the application's sign-in flow",
			log.String("flowID", flowID), log.String("error", svcErr.Error.DefaultValue))
		return &tidcommon.InternalServerError
	}
	for _, node := range flow.Nodes {
		if node.Executor == nil || node.Executor.Name != executormeta.ExecutorNamePasskeyAuth {
			continue
		}
		if id, _ := node.Properties[propertyRelyingPartyID].(string); id != "" {
			cfg.relyingPartyID = id
			cfg.relyingPartyName, _ = node.Properties[propertyRelyingPartyName].(string)
			return nil
		}
	}
	return nil
}
