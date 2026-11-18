// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

window.__THUNDERID_RUNTIME_CONFIG__ = {
  client: {
    base: '/myaccount',
    client_id: 'MY_ACCOUNT',
    // The My Account application's ID. The app's theme, name and logo are read from it, so
    // My Account takes the branding assigned to this application.
    application_id: '01900000-0000-7000-8000-0000000000f7',
    scopes: ['openid', 'profile', 'email'],
  },
  // Defaults to the origin this app is served from. Add a `server` block with `public_url`
  // to target a different backend.
};
