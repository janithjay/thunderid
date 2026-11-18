// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The settings `public/config.js` sets on `window` when the page loads, so one build serves any
 * Data Plane. The server copies the app as built, and a deployment edits `config.js` in place.
 */
export interface RuntimeConfig {
  client: {
    application_id?: string;
    base: string;
    client_id: string;
    scopes?: string[];
  };
  server?: {public_url?: string};
}

declare global {
  interface Window {
    __THUNDERID_RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export const getRuntimeConfig = (): RuntimeConfig | undefined => window.__THUNDERID_RUNTIME_CONFIG__;

/**
 * The server to talk to: `server.public_url` when set, the dev server's URL under `pnpm dev`, and
 * otherwise the origin the app is served from, which is the Data Plane itself.
 */
export const getServerUrl = (config: RuntimeConfig): string =>
  [config.server?.public_url, __DEV_SERVER_URL__].find(Boolean) ?? window.location.origin;

/**
 * Where the app lives, which is also where sign-in and sign-out return to. It ends in a slash because
 * the server serves the app from `<base>/` and redirects `<base>` there, and the SDK recognizes the
 * sign-in callback only on the exact URL it returns to.
 */
export const getAppUrl = (config: RuntimeConfig): string => `${window.location.origin}${config.client.base}/`;

/** The CSP nonce the server rendered into the page, for the SDK's runtime `<style>` tags. */
export const getCspNonce = (): string | undefined => {
  const nonce: string | null | undefined = document
    .querySelector('meta[property="csp-nonce"]')
    ?.getAttribute('content');

  // An unrendered placeholder (the dev server serves index.html as is) is no nonce.
  return nonce && nonce !== '__CSP_NONCE__' ? nonce : undefined;
};
