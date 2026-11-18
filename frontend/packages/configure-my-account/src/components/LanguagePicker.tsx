// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Button, MenuItem, Stack, TextField} from '@wso2/oxygen-ui';
import {Plus} from '@wso2/oxygen-ui-icons-react';
import {useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import {PanelField} from './PanelSection';
import {DEFAULT_TEXT_LANGUAGE} from '../constants/catalog';

const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

interface LanguagePickerProps {
  language: string;
  /** The languages the layout already has text in. */
  languages: string[];
  onChange: (language: string) => void;
  readOnly: boolean;
}

/** The language text is edited in, from the ones the layout has text in, or a new one. */
export default function LanguagePicker({language, languages, onChange, readOnly}: LanguagePickerProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const [newLanguage, setNewLanguage] = useState<string>('');
  const options: string[] = Array.from(new Set([DEFAULT_TEXT_LANGUAGE, ...languages, language]));
  const invalid: boolean = newLanguage !== '' && !LANGUAGE_PATTERN.test(newLanguage);

  return (
    <>
      <PanelField id="my-account-text-language" label={t('text.language', 'Language')}>
        <TextField
          id="my-account-text-language"
          select
          size="small"
          value={language}
          onChange={(event) => onChange(event.target.value)}
          slotProps={{select: {labelId: 'my-account-text-language-label'}}}
          fullWidth
        >
          {options.map((option: string) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </PanelField>
      {!readOnly && (
        <PanelField
          id="my-account-text-new-language"
          label={t('text.addLanguage', 'Add a language')}
          error={invalid}
          helperText={invalid ? t('text.languageHint', 'Use a language tag, such as fr-FR.') : undefined}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              id="my-account-text-new-language"
              size="small"
              placeholder="fr-FR"
              value={newLanguage}
              error={invalid}
              onChange={(event) => setNewLanguage(event.target.value.trim())}
              fullWidth
            />
            <Button
              variant="outlined"
              startIcon={<Plus size={16} />}
              disabled={!LANGUAGE_PATTERN.test(newLanguage)}
              onClick={() => {
                onChange(newLanguage);
                setNewLanguage('');
              }}
            >
              {t('text.add', 'Add')}
            </Button>
          </Stack>
        </PanelField>
      )}
    </>
  );
}
