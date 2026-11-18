// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BUILT_IN_TABS, DEFAULT_TEXT_LANGUAGE, SECTION_CATALOG} from '../constants/catalog';
import type {MyAccountSection, MyAccountTab, MyAccountText} from '../models/my-account';

/** Translates a key, with the English text to show when it has no translation. */
export type Translate = (key: string, fallback: string) => string;

/**
 * The configuration's text My Account shows in a language, as the server serves it: the text for the language
 * over the text for its base language (en for en-GB), over the text for the default language.
 */
export const textFor = (text: MyAccountText, language: string): Record<string, string> => {
  const base: string = language.split('-')[0];
  return {
    ...text[DEFAULT_TEXT_LANGUAGE],
    ...(base !== language ? text[base] : undefined),
    ...text[language],
  };
};

/**
 * The name My Account shows for a tab: the configuration's text in the language, else My Account's own name for
 * a built-in tab, else the tab's ID.
 */
export const tabLabel = (t: Translate, tab: MyAccountTab, text: MyAccountText, language: string): string => {
  const own: string | undefined = textFor(text, language)[`tabs.${tab.id}`];
  if (own) {
    return own;
  }
  const builtIn: [string, string] | undefined = tab.custom ? undefined : BUILT_IN_TABS[tab.id];
  return builtIn ? t(builtIn[0], builtIn[1]) : tab.id;
};

/** The name of a component, as the catalog names it. */
export const sectionName = (t: Translate, section: MyAccountSection): string => {
  const entry = SECTION_CATALOG.find((item) => item.type === section.type);
  return entry ? t(entry.name[0], entry.name[1]) : section.type;
};

/** What tells two credential components apart: the credential each changes. */
export const sectionDetail = (section: MyAccountSection): string | undefined =>
  section.type === 'credential' ? section.attribute : undefined;

/**
 * A component as code, the way the preview names it: the component that renders it in My Account, with the
 * credential a credential component changes, such as `<ChangeCredential attribute="pin" />`.
 */
export const sectionTag = (section: MyAccountSection): string => {
  const component: string = SECTION_CATALOG.find((item) => item.type === section.type)?.component ?? section.type;
  return section.type === 'credential' && section.attribute
    ? `<${component} attribute="${section.attribute}" />`
    : `<${component} />`;
};
