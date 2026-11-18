// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useThunderID} from '@thunderid/react';
import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';

interface I18nMeta {
  i18n?: {
    language?: string;
    translations?: Record<string, Record<string, string>>;
  };
}

/**
 * Merges the translations the server returns for this application over the built-in ones, so text
 * customized on the server shows here, and switches to the language the server resolved. The same
 * merge the Gate does.
 */
export default function useServerTranslations(): void {
  const {meta} = useThunderID();
  const {i18n} = useTranslation();

  useEffect(() => {
    const i18nMeta: I18nMeta['i18n'] = (meta as I18nMeta | null)?.i18n;
    const translations: Record<string, Record<string, string>> | undefined = i18nMeta?.translations;
    if (!translations) {
      return;
    }

    const language: string = i18nMeta?.language ?? i18n.language;
    const namespaces: string[] = Object.keys(translations).filter(
      (namespace: string) => Object.keys(translations[namespace] ?? {}).length > 0,
    );

    namespaces.forEach((namespace: string) => {
      i18n.addResourceBundle(language, namespace, translations[namespace], true, true);
    });

    if (namespaces.length > 0) {
      i18n.emit('added', language, namespaces);
    }

    if (language !== i18n.language) {
      i18n.changeLanguage(language).catch(() => undefined);
    }
  }, [meta, i18n]);
}
