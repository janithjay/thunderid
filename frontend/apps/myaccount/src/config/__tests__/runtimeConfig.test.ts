// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it} from 'vitest';
import {getAppBase, getAppUrl, getCspNonce, getServerUrl, type RuntimeConfig} from '../runtimeConfig';

const config: RuntimeConfig = {client: {client_id: 'MY_ACCOUNT'}};

describe('runtimeConfig', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    window.history.replaceState(null, '', '/');
  });

  it('uses the configured server URL', () => {
    expect(getServerUrl({...config, server: {public_url: 'https://id.example.com'}})).toBe('https://id.example.com');
  });

  it('defaults to the origin the app is served from', () => {
    expect(getServerUrl(config)).toBe(__DEV_SERVER_URL__ || window.location.origin);
  });

  it('takes its base path from the first segment of the address, whatever path it is served under', () => {
    window.history.replaceState(null, '', '/mythunderid/security');
    expect(getAppBase()).toBe('/mythunderid');

    window.history.replaceState(null, '', '/myaccount/');
    expect(getAppBase()).toBe('/myaccount');
  });

  it('builds the app URL from the origin and the base path, ending in the slash the server serves it under', () => {
    window.history.replaceState(null, '', '/mythunderid/home');

    expect(getAppUrl()).toBe(`${window.location.origin}/mythunderid/`);
  });

  it('reads the nonce the server rendered into the page', () => {
    document.head.innerHTML = '<meta property="csp-nonce" content="abc123" />';

    expect(getCspNonce()).toBe('abc123');
  });

  it('treats an unrendered placeholder or a missing tag as no nonce', () => {
    expect(getCspNonce()).toBeUndefined();

    document.head.innerHTML = '<meta property="csp-nonce" content="__CSP_NONCE__" />';
    expect(getCspNonce()).toBeUndefined();
  });
});
