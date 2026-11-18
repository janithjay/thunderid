// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {TextField} from '@wso2/oxygen-ui';
import type {JSX} from 'react';
import {useTranslation} from 'react-i18next';
import {PanelField} from './PanelSection';
import {BUILT_IN_TABS, DEFAULT_TEXT_LANGUAGE} from '../constants/catalog';
import type {MyAccountTab, MyAccountText} from '../models/my-account';
import {tabLabel} from '../utils/labels';
import {setOwnText} from '../utils/layoutEditing';

// My Account's own headings of the built-in tabs, in its own language.
const DEFAULT_HEADINGS: Record<string, [string, string]> = {
  home: ['Welcome, {{name}}', 'Manage your info and security to make your account work better for you.'],
  personal: ['Personal info', 'Manage the basic profile info others may see.'],
  security: ['Security', 'Manage your password, passkeys and other credentials.'],
  devices: [
    'Your devices',
    "Where you're signed in, and the apps you used there. Sign out of any device you don't recognize.",
  ],
};

/**
 * One piece of text the editor offers: its key, its label, My Account's own text for it in the language, and in
 * My Account's own language.
 */
interface EditableText {
  defaultValue: string;
  /** What the field takes, shown under it. */
  hint?: string;
  key: string;
  label: string;
  multiline?: boolean;
  ownText: string;
  required?: boolean;
}

interface TextEditorProps {
  language: string;
  onChange: (text: MyAccountText) => void;
  readOnly: boolean;
  /** The tab whose text is edited: its name and headings. */
  tab: MyAccountTab;
  text: MyAccountText;
}

/**
 * The text My Account shows for a tab, in one language at a time: its name and headings, Home's being the greeting
 * and introduction at its top. Each field shows the text My Account shows, its own text until it is changed.
 */
export default function TextEditor({language, onChange, readOnly, tab, text}: TextEditorProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');

  const builtIn: boolean = !tab.custom && tab.id in BUILT_IN_TABS;
  // My Account's own text is in its own language; in another, a field starts empty.
  const own = (value: string): string => (builtIn && language === DEFAULT_TEXT_LANGUAGE ? value : '');
  const name: string = builtIn ? tabLabel(t, tab, {}, language) : '';
  const fields: EditableText[] = [
    {
      key: `tabs.${tab.id}`,
      label: t('text.name', 'Name in the menu'),
      defaultValue: own(name),
      ownText: name,
      required: true,
    },
  ];
  const home: boolean = builtIn && tab.id === 'home';
  const [title, subtitle] = (builtIn && DEFAULT_HEADINGS[tab.id]) || ['', ''];
  if (builtIn) {
    fields.push({
      // Home's heading greets the user, and My Account reads it under its own key.
      key: home ? 'home.greeting' : `${tab.id}.title`,
      label: t('text.heading', 'Heading'),
      defaultValue: own(title),
      ownText: title,
      // The placeholder goes in as a value, so it is shown rather than filled in.
      hint: home
        ? t('text.greetingHint', "{{placeholder}} shows the user's name.", {placeholder: '{{name}}'})
        : undefined,
    });
  }
  fields.push({
    key: `${tab.id}.subtitle`,
    label: t('text.introduction', 'Introduction'),
    defaultValue: own(subtitle),
    ownText: subtitle,
    multiline: true,
  });

  const values: Record<string, string> = text[language] ?? {};

  return (
    <>
      {fields.map((field: EditableText) => {
        const id = `my-account-text-${field.key}`;
        const changed: boolean = field.key in values;
        const value: string = changed ? values[field.key] : field.defaultValue;
        // A name cleared on purpose is kept empty and flagged, rather than going back to My Account's own.
        const empty: boolean = Boolean(field.required) && changed && value.trim() === '';
        const keepEmpty: boolean = Boolean(field.required) && field.defaultValue === '';
        return (
          <PanelField
            key={`${language}-${field.key}`}
            id={id}
            label={field.label}
            required={field.required}
            error={empty}
            helperText={empty ? t('text.nameRequired', 'Enter a name.') : field.hint}
          >
            <TextField
              id={id}
              value={value}
              placeholder={field.ownText || undefined}
              error={empty}
              onChange={(event) =>
                onChange(
                  setOwnText(text, language, field.key, event.target.value, keepEmpty ? undefined : field.defaultValue),
                )
              }
              slotProps={{input: {readOnly}, htmlInput: {maxLength: 500}}}
              multiline={field.multiline}
              minRows={field.multiline ? 2 : undefined}
              size="small"
              fullWidth
            />
          </PanelField>
        );
      })}
    </>
  );
}
