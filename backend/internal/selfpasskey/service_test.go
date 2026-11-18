// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package selfpasskey

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	tidcommon "github.com/thunder-id/thunderid/pkg/thunderidengine/common"
	"github.com/thunder-id/thunderid/pkg/thunderidengine/providers"

	"github.com/thunder-id/thunderid/internal/authn/passkey"
	"github.com/thunder-id/thunderid/internal/inboundclient"
	"github.com/thunder-id/thunderid/internal/system/config"
	"github.com/thunder-id/thunderid/tests/mocks/authn/passkeymock"
	"github.com/thunder-id/thunderid/tests/mocks/flow/flowmgtmock"
	"github.com/thunder-id/thunderid/tests/mocks/inboundclientmock"
)

const (
	testUserID   = "user-1"
	testClientID = "client-1"
	testAppID    = "app-1"
	testFlowID   = "flow-1"
)

type ServiceTestSuite struct {
	suite.Suite
	passkeyService *passkeymock.PasskeyServiceInterfaceMock
	inboundClient  *inboundclientmock.InboundClientServiceInterfaceMock
	flowMgt        *flowmgtmock.FlowMgtServiceInterfaceMock
	service        selfPasskeyServiceInterface
}

func TestServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ServiceTestSuite))
}

func (s *ServiceTestSuite) SetupTest() {
	config.ResetServerRuntime()
	s.Require().NoError(config.InitializeServerRuntime("", &config.Config{
		Passkey: config.PasskeyConfig{AllowedOrigins: []string{"https://server.example.org"}},
	}))
	s.passkeyService = passkeymock.NewPasskeyServiceInterfaceMock(s.T())
	s.inboundClient = inboundclientmock.NewInboundClientServiceInterfaceMock(s.T())
	s.flowMgt = flowmgtmock.NewFlowMgtServiceInterfaceMock(s.T())
	s.service = newSelfPasskeyService(s.passkeyService, s.inboundClient, s.flowMgt)
}

func (s *ServiceTestSuite) TearDownTest() {
	config.ResetServerRuntime()
}

func (s *ServiceTestSuite) expectAppOrigins(origins []string) {
	s.expectApp(&providers.InboundClient{PasskeyAllowedOrigins: origins})
}

// expectSignInFlow sets the app's sign-in flow, with the given nodes, and the app's passkey origins.
func (s *ServiceTestSuite) expectSignInFlow(origins []string, nodes ...providers.NodeDefinition) {
	s.expectApp(&providers.InboundClient{PasskeyAllowedOrigins: origins, AuthFlowID: testFlowID})
	s.flowMgt.On("GetFlow", mock.Anything, testFlowID).
		Return(&providers.CompleteFlowDefinition{ID: testFlowID, Nodes: nodes}, nil).Once()
}

// passkeyNode is a passkey step of a sign-in flow with the given properties.
func passkeyNode(properties map[string]interface{}) providers.NodeDefinition {
	return providers.NodeDefinition{
		ID:         "passkey",
		Type:       "TASK_EXECUTION",
		Properties: properties,
		Executor:   &providers.ExecutorDefinition{Name: "PasskeyAuthExecutor"},
	}
}

func (s *ServiceTestSuite) expectApp(app *providers.InboundClient) {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).
		Return(&providers.OAuthClient{ID: testAppID, ClientID: testClientID}, nil).Once()
	s.inboundClient.On("GetInboundClientByEntityID", mock.Anything, testAppID).Return(app, nil).Once()
}

func (s *ServiceTestSuite) TestStartRegistration_UsesSignInFlowRelyingParty() {
	origins := []string{"https://login.example.com", "android:apk-key-hash:abc"}
	s.expectSignInFlow(origins,
		providers.NodeDefinition{ID: "credentials", Executor: &providers.ExecutorDefinition{Name: "BasicAuthExecutor"}},
		passkeyNode(map[string]interface{}{"relyingPartyId": "example.com", "relyingPartyName": "Example"}))
	expected := &passkey.PasskeyRegistrationStartData{SessionToken: "token"}
	s.passkeyService.On("StartRegistration", mock.Anything, &passkey.PasskeyRegistrationStartRequest{
		UserID:           testUserID,
		RelyingPartyID:   "example.com",
		RelyingPartyName: "Example",
		AllowedOrigins:   origins,
	}).Return(expected, nil).Once()

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(svcErr)
	s.Equal(expected, data)
}

func (s *ServiceTestSuite) TestStartRegistration_SkipsPasskeyStepsWithoutRelyingParty() {
	s.expectSignInFlow(nil,
		passkeyNode(nil),
		passkeyNode(map[string]interface{}{"relyingPartyId": ""}),
		passkeyNode(map[string]interface{}{"relyingPartyId": "example.org"}))
	s.passkeyService.On("StartRegistration", mock.Anything, mock.MatchedBy(
		func(req *passkey.PasskeyRegistrationStartRequest) bool {
			return req.RelyingPartyID == "example.org" &&
				assert.ObjectsAreEqual([]string{"https://server.example.org"}, req.AllowedOrigins)
		})).Return(&passkey.PasskeyRegistrationStartData{}, nil).Once()

	_, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(svcErr)
}

func (s *ServiceTestSuite) TestStartRegistration_RefusedWithoutPasskeySignIn() {
	s.expectSignInFlow([]string{"https://login.example.com"},
		providers.NodeDefinition{ID: "credentials", Executor: &providers.ExecutorDefinition{Name: "BasicAuthExecutor"}},
		providers.NodeDefinition{ID: "end", Type: "END"})

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(data)
	s.Equal(ErrorPasskeySignInNotConfigured.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestStartRegistration_RefusedForUnknownApp() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).Return(nil, nil).Once()

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(data)
	s.Equal(ErrorPasskeySignInNotConfigured.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestStartRegistration_RefusedForMissingInboundClient() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).
		Return(&providers.OAuthClient{ID: testAppID}, nil).Once()
	s.inboundClient.On("GetInboundClientByEntityID", mock.Anything, testAppID).
		Return(nil, inboundclient.ErrInboundClientNotFound).Once()

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(data)
	s.Equal(ErrorPasskeySignInNotConfigured.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestStartRegistration_SignInFlowLookupError() {
	s.expectApp(&providers.InboundClient{AuthFlowID: testFlowID})
	s.flowMgt.On("GetFlow", mock.Anything, testFlowID).Return(nil, &tidcommon.InternalServerError).Once()

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(data)
	s.Equal(tidcommon.InternalServerError.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestStartRegistration_ClientLookupError() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).
		Return(nil, assert.AnError).Once()

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(data)
	s.Equal(tidcommon.InternalServerError.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestStartRegistration_AppLookupError() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).
		Return(&providers.OAuthClient{ID: testAppID}, nil).Once()
	s.inboundClient.On("GetInboundClientByEntityID", mock.Anything, testAppID).
		Return(nil, assert.AnError).Once()

	data, svcErr := s.service.StartRegistration(context.Background(), testUserID, testClientID)

	s.Nil(data)
	s.Equal(tidcommon.InternalServerError.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestFinishRegistration_Success() {
	origins := []string{"https://login.example.com"}
	s.expectAppOrigins(origins)
	req := &registrationFinishRequest{
		PublicKeyCredential: publicKeyCredential{
			ID:   "cred-1",
			Type: "public-key",
			Response: attestationResponse{
				ClientDataJSON:    "client-data",
				AttestationObject: "attestation",
			},
		},
		SessionToken: "token",
		Name:         " Work laptop ",
	}
	s.passkeyService.On("FinishRegistration", mock.Anything, &passkey.PasskeyRegistrationFinishRequest{
		CredentialID:      "cred-1",
		CredentialType:    "public-key",
		ClientDataJSON:    "client-data",
		AttestationObject: "attestation",
		SessionToken:      "token",
		AllowedOrigins:    origins,
		UserID:            testUserID,
		Name:              "Work laptop",
	}).Return(nil, nil).Once()

	saved, svcErr := s.service.FinishRegistration(context.Background(), testUserID, testClientID, req)

	s.Nil(svcErr)
	s.Equal(&passkey.PasskeyInfo{ID: "cred-1", Name: "Work laptop"}, saved)
}

func (s *ServiceTestSuite) TestFinishRegistration_PasskeyServiceError() {
	s.expectAppOrigins([]string{"https://login.example.com"})
	s.passkeyService.On("FinishRegistration", mock.Anything, mock.Anything).
		Return(nil, &passkey.ErrorInvalidSessionToken).Once()

	saved, svcErr := s.service.FinishRegistration(context.Background(), testUserID, testClientID,
		&registrationFinishRequest{})

	s.Nil(saved)
	s.Equal(passkey.ErrorInvalidSessionToken.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestFinishRegistration_OriginLookupError() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).
		Return(nil, assert.AnError).Once()

	saved, svcErr := s.service.FinishRegistration(context.Background(), testUserID, testClientID,
		&registrationFinishRequest{})

	s.Nil(saved)
	s.Equal(tidcommon.InternalServerError.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestListPasskeys() {
	s.expectSignInFlow(nil, passkeyNode(map[string]interface{}{"relyingPartyId": "example.com"}))
	passkeys := []passkey.PasskeyInfo{{ID: "cred-1", Name: "Work laptop"}}
	s.passkeyService.On("ListPasskeys", mock.Anything, testUserID).Return(passkeys, nil).Once()

	list, svcErr := s.service.ListPasskeys(context.Background(), testUserID, testClientID)

	s.Nil(svcErr)
	s.Equal(&passkeyListResponse{Passkeys: passkeys, RelyingPartyID: "example.com"}, list)
}

// The passkeys are listed even when the app's sign-in flow has no passkey step.
func (s *ServiceTestSuite) TestListPasskeys_WithoutPasskeySignIn() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).Return(nil, nil).Once()
	s.passkeyService.On("ListPasskeys", mock.Anything, testUserID).Return([]passkey.PasskeyInfo{}, nil).Once()

	list, svcErr := s.service.ListPasskeys(context.Background(), testUserID, testClientID)

	s.Nil(svcErr)
	s.Equal(&passkeyListResponse{Passkeys: []passkey.PasskeyInfo{}}, list)
}

func (s *ServiceTestSuite) TestListPasskeys_Errors() {
	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).Return(nil, assert.AnError).Once()

	list, svcErr := s.service.ListPasskeys(context.Background(), testUserID, testClientID)

	s.Nil(list)
	s.Equal(tidcommon.InternalServerError.Code, svcErr.Code)

	s.inboundClient.On("GetOAuthClientByClientID", mock.Anything, testClientID).Return(nil, nil).Once()
	s.passkeyService.On("ListPasskeys", mock.Anything, testUserID).Return(nil, &tidcommon.InternalServerError).Once()

	list, svcErr = s.service.ListPasskeys(context.Background(), testUserID, testClientID)

	s.Nil(list)
	s.Equal(tidcommon.InternalServerError.Code, svcErr.Code)
}

func (s *ServiceTestSuite) TestDeletePasskey() {
	s.passkeyService.On("DeletePasskey", mock.Anything, testUserID, "cred-1").Return(nil).Once()

	s.Nil(s.service.DeletePasskey(context.Background(), testUserID, "cred-1"))
}
