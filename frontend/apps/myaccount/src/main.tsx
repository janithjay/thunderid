// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import './i18n/i18n';
import {ThunderIDProvider} from '@thunderid/react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {getAppUrl, getCspNonce, getRuntimeConfig, getServerUrl, type RuntimeConfig} from './config/runtimeConfig';
import './index.css';

const config: RuntimeConfig | undefined = getRuntimeConfig();

if (!config) {
  throw new Error('config.js did not load, so the client settings are missing.');
}

const appUrl: string = getAppUrl(config);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThunderIDProvider
      baseUrl={getServerUrl(config)}
      clientId={config.client.client_id}
      applicationId={config.client.application_id}
      scopes={config.client.scopes}
      afterSignInUrl={appUrl}
      afterSignOutUrl={appUrl}
      cspNonce={getCspNonce()}
    >
      <App />
    </ThunderIDProvider>
  </StrictMode>,
);
