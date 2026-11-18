// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import enUS from '@thunderid/i18n/locales/en-US';
import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';

/** The namespace every string of this app lives in. */
export const NAMESPACE = 'myaccount';

// The language the built-in strings are in. Only the locale is imported from `@thunderid/i18n`: its
// index pulls in the Console's API hooks and icons, which this app has no use for.
const FALLBACK_LANGUAGE = 'en-US';

await i18next.use(initReactI18next).init({
  resources: {
    [FALLBACK_LANGUAGE]: {[NAMESPACE]: enUS[NAMESPACE]},
  },
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  defaultNS: NAMESPACE,
  keySeparator: false,
  interpolation: {
    escapeValue: false,
  },
  // Text added later, from the server or the Console's preview, renders again what it replaces.
  react: {
    bindI18nStore: 'added removed',
  },
});

export default i18next;
