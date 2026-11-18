// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

const currentDir = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 5194;
const HOST = process.env.HOST ?? 'localhost';
// Served from the Data Plane's `/myaccount` mount (see build.sh's prepare_frontend_for_packaging).
const BASE_URL = process.env.BASE_URL ?? '/myaccount';

// Dev backend URL, from THUNDERID_DEV_SERVER_URL (default https://localhost:8090). Injected into
// __DEV_SERVER_URL__ only for the dev server; production builds receive an empty string, so the app
// talks to the origin it is served from.
const DEV_SERVER_URL = process.env.THUNDERID_DEV_SERVER_URL?.trim();

// https://vite.dev/config/
export default defineConfig(({command}) => ({
  base: BASE_URL,
  define: {
    __DEV_SERVER_URL__: JSON.stringify(
      command === 'serve'
        ? DEV_SERVER_URL && DEV_SERVER_URL.length > 0
          ? DEV_SERVER_URL
          : 'https://localhost:8090'
        : '',
    ),
  },
  server: {
    port: PORT,
    host: HOST,
  },
  resolve: {
    // The SDK may be linked from a local checkout, which carries its own React. Resolve every
    // import of these to this app's copy, so there is one React and one router.
    alias: {
      react: resolve(currentDir, './node_modules/react'),
      'react-dom': resolve(currentDir, './node_modules/react-dom'),
      'react-router': resolve(currentDir, './node_modules/react-router'),
    },
  },
  plugins: [basicSsl(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: resolve(currentDir, 'src', 'test', 'setup.ts'),
    reporters: process.env.CI ? ['dot'] : ['default'],
    restoreMocks: true,
  },
}));
