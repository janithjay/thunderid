// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"

	serverconst "github.com/thunder-id/thunderid/internal/system/constants"
	sysContext "github.com/thunder-id/thunderid/internal/system/context"
	"github.com/thunder-id/thunderid/internal/system/csp"
)

// myAccountPolicyLocation is the csp server-config location whose directives apply to My Account, under
// whatever path the server serves it.
const myAccountPolicyLocation = "/myaccount/"

// SecurityHeadersMiddleware applies X-Frame-Options: DENY to every response and the deny-first
// Content-Security-Policy to Gate, Console and My Account responses, the only responses that render as
// documents a browser enforces CSP against. Everything else (API, OAuth2) is JSON or a redirect, where a CSP
// header would be inert. My Account is served under myAccountPath, its configured path prefix such as
// "/myaccount/", and takes the directives of the policy's "/myaccount/" location there. The effective CSP
// policy is resolved per request from the csp server-config section, falling back to the deny-first baseline
// in report-only mode when unset. X-Frame-Options stays global since, unlike CSP, it has no report-only mode.
//
// A fresh nonce is generated per request and both embedded in the CSP header's style-src-elem
// directive and stored in the request context, so a downstream handler (serveIndex) can render it
// into the HTML response for the frontend to apply to its own inline <style> tags.
func SecurityHeadersMiddleware(myAccountPath string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set(serverconst.XFrameOptionsHeaderName, serverconst.XFrameOptionsDeny)

			if policyPath, ok := cspPolicyPath(r.URL.Path, myAccountPath); ok {
				nonce := generateNonce()
				r = r.WithContext(sysContext.WithCSPNonce(r.Context(), nonce))
				policy := csp.Resolve(r.Context())
				w.Header().Set(policy.HeaderName(), policy.HeaderValue(policyPath, nonce))
			}

			next.ServeHTTP(w, r)
		})
	}
}

// cspPolicyPath reports whether path belongs to the Gate, Console or My Account app, and returns the path the
// CSP policy's locations are matched against: the path itself, or for My Account, the same path under
// myAccountPolicyLocation.
func cspPolicyPath(path, myAccountPath string) (string, bool) {
	if myAccountPath != "" && strings.HasPrefix(path, myAccountPath) {
		return myAccountPolicyLocation + strings.TrimPrefix(path, myAccountPath), true
	}
	if strings.HasPrefix(path, "/gate/") || strings.HasPrefix(path, "/console/") {
		return path, true
	}
	return "", false
}

// generateNonce returns a fresh base64-encoded random value for the CSP nonce. It must be
// regenerated for every response, never reused, so a leaked nonce from one response cannot
// authorize content in another.
func generateNonce() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}
