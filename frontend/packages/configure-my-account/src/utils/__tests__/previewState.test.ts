// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {DEFAULT_TABS} from '../../constants/catalog';
import type {MyAccountTab} from '../../models/my-account';
import {buildPreviewState} from '../previewState';

const t = (_key: string, fallback: string): string => fallback;

describe('buildPreviewState', () => {
  const tabs: MyAccountTab[] = [
    ...DEFAULT_TABS,
    {
      id: 'help',
      custom: true,
      icon: 'help',
      sections: [{id: 'docs', type: 'widget', blocks: [{id: 'title', type: 'heading'}]}],
    },
  ];

  it("sends the draft's text for the language, and names every tab, and every component as code", () => {
    const state = buildPreviewState({
      t,
      accent: '#1a73e8',
      application: {name: 'My Account'},
      colorScheme: 'dark',
      designTheme: null,
      editable: true,
      language: 'fr',
      selection: {tabId: 'help'},
      tabs,
      text: {'en-US': {'tabs.help': 'Help'}, fr: {'tabs.help': 'Aide'}},
    });

    expect(state.text).toEqual({'tabs.help': 'Aide'});
    expect(state.tabs).toBe(tabs);
    expect(state.colorScheme).toBe('dark');
    expect(state.labels['tab:help']).toBe('Menu item: Aide');
    expect(state.labels['tab:security']).toBe('Menu item: Security');
    expect(state.labels['section:passkeys']).toBe('<Passkeys />');
    expect(state.labels['section:password']).toBe('<ChangeCredential attribute="password" />');
    expect(state.labels['section:profile']).toBe('<UserProfile />');
    expect(state.labels['section:sessions']).toBe('<ActiveSessions />');
    expect(state.labels['section:security-checkup']).toBe('<SecurityCheckupCard />');
    expect(state.labels['section:docs']).toBe('<CustomWidget />');
    expect(state.strings.addComponent).toBe('Add component');
    expect(state.strings.addTab).toBe('Add new feature');
    expect(state.strings.hidden).toBe('Hidden');
  });

  it('falls back to the base language and then the default language, as the server does', () => {
    const state = buildPreviewState({
      t,
      accent: '#1a73e8',
      application: {name: 'My Account'},
      colorScheme: 'light',
      designTheme: null,
      editable: true,
      language: 'de-AT',
      selection: {tabId: 'home'},
      tabs,
      text: {'en-US': {'tabs.help': 'Help', 'help.subtitle': 'Get help'}, de: {'help.subtitle': 'Hilfe finden'}},
    });

    expect(state.text).toEqual({'tabs.help': 'Help', 'help.subtitle': 'Hilfe finden'});
    expect(state.labels['tab:help']).toBe('Menu item: Help');
  });
});
