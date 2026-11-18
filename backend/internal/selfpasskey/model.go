// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package selfpasskey

import "github.com/thunder-id/thunderid/internal/authn/passkey"

// publicKeyCredential is the WebAuthn credential the device created.
type publicKeyCredential struct {
	ID       string              `json:"id"`
	Type     string              `json:"type"`
	Response attestationResponse `json:"response"`
}

// attestationResponse is the attestation the device returned for a new passkey.
type attestationResponse struct {
	ClientDataJSON    string `json:"clientDataJSON"`
	AttestationObject string `json:"attestationObject"`
}

// registrationFinishRequest is the request to save a new passkey.
type registrationFinishRequest struct {
	PublicKeyCredential publicKeyCredential `json:"publicKeyCredential"`
	SessionToken        string              `json:"sessionToken"`
	Name                string              `json:"name,omitempty"`
}

// passkeyListResponse is the list of the user's passkeys, and the relying party they belong to, when the
// app's sign-in flow names one.
type passkeyListResponse struct {
	Passkeys       []passkey.PasskeyInfo `json:"passkeys"`
	RelyingPartyID string                `json:"relyingPartyId,omitempty"`
}
