// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {DEFAULT_TABS, isBuiltInTab, resolveTabs, type AccountTab} from '../accountLayout';

describe('resolveTabs', () => {
  it('uses the default layout without a configuration', () => {
    expect(resolveTabs(undefined)).toEqual(DEFAULT_TABS);
  });

  it('keeps the configured order and drops hidden tabs', () => {
    const tabs: AccountTab[] = [
      {id: 'home', hidden: true, sections: []},
      {id: 'security', sections: [{id: 'passkeys', type: 'passkeys'}]},
      {
        id: 'help',
        custom: true,
        icon: 'help',
        sections: [{id: 'support', type: 'widget', blocks: [{id: 'open', type: 'button', url: 'https://example.com'}]}],
      },
    ];

    expect(resolveTabs(tabs).map((tab: AccountTab) => tab.id)).toEqual(['security', 'help']);
  });

  it('drops sections it cannot render, such as an unknown type or a widget with nothing it can show', () => {
    const tabs = [
      {
        id: 'help',
        custom: true,
        sections: [
          {id: 'map', type: 'map'},
          {id: 'insecure', type: 'widget', blocks: [{id: 'open', type: 'button', url: 'http://example.com'}]},
          {id: 'empty', type: 'widget', blocks: []},
          {id: 'ok', type: 'widget', blocks: [{id: 'title', type: 'heading'}]},
        ],
      },
    ] as AccountTab[];

    expect(resolveTabs(tabs)[0].sections.map((section) => section.id)).toEqual(['ok']);
  });

  it('drops hidden sections, and keeps hidden tabs and sections for the preview', () => {
    const configured: AccountTab[] = [
      {id: 'security', hidden: true, sections: [{id: 'passkeys', type: 'passkeys'}]},
      {
        id: 'personal',
        sections: [
          {id: 'profile', type: 'profile'},
          {id: 'password', type: 'credential', attribute: 'password', hidden: true},
        ],
      },
    ];

    expect(resolveTabs(configured)).toEqual([{id: 'personal', sections: [{id: 'profile', type: 'profile'}]}]);
    expect(resolveTabs(configured, true)).toEqual(configured);
  });

  it('falls back to the default layout when every tab is hidden', () => {
    expect(resolveTabs([{id: 'home', hidden: true, sections: []}])).toEqual(DEFAULT_TABS);
  });

  it('knows the built-in tabs', () => {
    expect(isBuiltInTab('security')).toBe(true);
    expect(isBuiltInTab('help')).toBe(false);
  });
});
