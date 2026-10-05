// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package sessionmgt

import (
	sysutils "github.com/thunder-id/thunderid/internal/system/utils"
)

// participantResponse is an application that has joined a session under an organization unit. OUID is
// omitted when the sign-in had none, and AppName and AppLogoURL when they can't be resolved.
type participantResponse struct {
	AppID         string `json:"appId"`
	OUID          string `json:"ouId,omitempty"`
	AppName       string `json:"appName,omitempty"`
	AppLogoURL    string `json:"appLogoUrl,omitempty"`
	FirstJoinedAt string `json:"firstJoinedAt"`
	LastActiveAt  string `json:"lastActiveAt"`
}

// sessionResponse is the API view of a live session. It never carries the session handle, the
// checkpoint contexts or the token family ids. UserName is omitted when it can't be resolved, and
// IsCurrent is set only on the caller's own sessions.
type sessionResponse struct {
	ID                string                `json:"id"`
	UserID            string                `json:"userId"`
	UserName          string                `json:"userName,omitempty"`
	UserAgent         string                `json:"userAgent,omitempty"`
	CreationIP        string                `json:"creationIp,omitempty"`
	LastActiveIP      string                `json:"lastActiveIp,omitempty"`
	AuthenticatedAt   string                `json:"authenticatedAt"`
	CreatedAt         string                `json:"createdAt"`
	LastActiveAt      string                `json:"lastActiveAt"`
	IdleExpiresAt     string                `json:"idleExpiresAt,omitempty"`
	AbsoluteExpiresAt string                `json:"absoluteExpiresAt,omitempty"`
	IsCurrent         *bool                 `json:"isCurrent,omitempty"`
	Participants      []participantResponse `json:"participants"`
}

// sessionListResponse is the paginated body of GET /sessions and GET /users/me/sessions.
type sessionListResponse struct {
	TotalResults int               `json:"totalResults"`
	StartIndex   int               `json:"startIndex"`
	Count        int               `json:"count"`
	Sessions     []sessionResponse `json:"sessions"`
	Links        []sysutils.Link   `json:"links"`
}

// appDisplay is the name and logo of a participating application, shown with the session.
type appDisplay struct {
	name    string
	logoURL string
}
