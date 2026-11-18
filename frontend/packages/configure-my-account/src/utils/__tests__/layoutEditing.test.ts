// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {DEFAULT_TABS} from '../../constants/catalog';
import type {MyAccountTab} from '../../models/my-account';
import {
  addBlock,
  addComponent,
  addCustomTab,
  addSection,
  allowedSections,
  layoutOf,
  layoutProblem,
  moveBefore,
  moveSection,
  removeSection,
  removeSectionText,
  removedBuiltInTabs,
  removeTab,
  restoreBuiltInTab,
  setOwnText,
  setTabIcon,
  setText,
  toggleSectionHidden,
  toggleTabHidden,
  uniqueId,
  usedIds,
} from '../layoutEditing';

const ids = (tabs: MyAccountTab[]): string[] => tabs.map((tab: MyAccountTab) => tab.id);

describe('layout editing', () => {
  it('moves an item before another, or to the end, and leaves the original as it was', () => {
    const tabs: MyAccountTab[] = DEFAULT_TABS;

    expect(ids(moveBefore(tabs, 'security', 'personal'))).toEqual(['home', 'security', 'personal', 'devices']);
    expect(ids(moveBefore(tabs, 'home', null))).toEqual(['personal', 'security', 'devices', 'home']);
    expect(ids(moveBefore(tabs, 'home', 'home'))).toEqual(ids(tabs));
    expect(ids(moveBefore(tabs, 'missing', 'home'))).toEqual(ids(tabs));
    expect(ids(tabs)).toEqual(['home', 'personal', 'security', 'devices']);
  });

  it('hides, adds and removes tabs, and brings a removed built-in tab back', () => {
    const hidden: MyAccountTab[] = toggleTabHidden(DEFAULT_TABS, 'home');
    expect(hidden[0].hidden).toBe(true);
    expect(toggleTabHidden(hidden, 'home')[0].hidden).toBe(false);

    const withHelp: MyAccountTab[] = addCustomTab(DEFAULT_TABS, 'help', {icon: 'help'});
    expect(withHelp[4]).toEqual({id: 'help', custom: true, icon: 'help', sections: []});
    expect(ids(removeTab(withHelp, 'help'))).toEqual(ids(DEFAULT_TABS));

    const withoutHome: MyAccountTab[] = removeTab(withHelp, 'home');
    expect(ids(withoutHome)).toEqual(['personal', 'security', 'devices', 'help']);
    expect(ids(removedBuiltInTabs(withoutHome))).toEqual(['home']);
    expect(restoreBuiltInTab(withoutHome, 'home')[4]).toEqual(DEFAULT_TABS[0]);
    expect(restoreBuiltInTab(withoutHome, 'security')).toBe(withoutHome);
  });

  it("changes a tab's icon to a named one or an image, and back to its own", () => {
    const image = 'https://cdn.example.com/lock.svg';
    const withImage: MyAccountTab[] = setTabIcon(DEFAULT_TABS, 'security', {iconUrl: image});
    expect(withImage[2]).toEqual({...DEFAULT_TABS[2], iconUrl: image});
    expect(setTabIcon(withImage, 'security', {icon: 'star'})[2]).toEqual({...DEFAULT_TABS[2], icon: 'star'});
    expect(setTabIcon(withImage, 'security', {})[2]).toEqual(DEFAULT_TABS[2]);
    expect(addCustomTab([], 'help', {iconUrl: image})[0]).toEqual({
      id: 'help',
      custom: true,
      iconUrl: image,
      sections: [],
    });
  });

  it('takes only an https address as an icon image', () => {
    expect(layoutProblem(setTabIcon(DEFAULT_TABS, 'home', {iconUrl: 'https://cdn.example.com/i.svg'}))).toBeUndefined();
    expect(layoutProblem(setTabIcon(DEFAULT_TABS, 'home', {iconUrl: 'http://cdn.example.com/i.svg'}))?.[0]).toBe(
      'validation.invalidIcon',
    );
  });

  it('never gives a custom tab the ID of a built-in tab, even a removed one', () => {
    expect(uniqueId('Security', usedIds(removeTab(DEFAULT_TABS, 'security')))).toBe('security-2');
  });

  it('hides a component, and shows it again', () => {
    const hidden: MyAccountTab[] = toggleSectionHidden(DEFAULT_TABS, 'security', 'passkeys');
    expect(hidden[2].sections[1]).toEqual({id: 'passkeys', type: 'passkeys', hidden: true});
    expect(toggleSectionHidden(hidden, 'security', 'passkeys')[2].sections[1].hidden).toBe(false);
  });

  it("keeps text that differs from My Account's own, even empty, and drops text equal to it", () => {
    expect(setOwnText({}, 'en-US', 'tabs.home', 'Overview', 'Home')).toEqual({'en-US': {'tabs.home': 'Overview'}});
    expect(setOwnText({}, 'en-US', 'home.subtitle', '', 'Welcome')).toEqual({'en-US': {'home.subtitle': ''}});
    expect(setOwnText({'en-US': {'tabs.home': 'Overview'}}, 'en-US', 'tabs.home', 'Home', 'Home')).toEqual({});
    expect(setOwnText({}, 'en-US', 'tabs.help', '', undefined)).toEqual({'en-US': {'tabs.help': ''}});
  });

  it('adds, moves and removes components', () => {
    let tabs: MyAccountTab[] = addSection(DEFAULT_TABS, 'security', {id: 'pin', type: 'credential', attribute: 'pin'});
    expect(tabs[2].sections.map((section) => section.id)).toEqual(['password', 'passkeys', 'pin']);

    tabs = moveSection(tabs, 'security', 'pin', 'password');
    expect(tabs[2].sections.map((section) => section.id)).toEqual(['pin', 'password', 'passkeys']);

    tabs = removeSection(tabs, 'security', 'password');
    expect(tabs[2].sections.map((section) => section.id)).toEqual(['pin', 'passkeys']);
  });

  it('offers Home cards only in Home, other components elsewhere, and widgets anywhere', () => {
    const home = allowedSections(DEFAULT_TABS[0]).map((entry) => entry.type);
    const security = allowedSections(DEFAULT_TABS[2]).map((entry) => entry.type);

    expect(home).toEqual(['home.personalInfo', 'home.securityCheckup', 'home.devices', 'home.apps', 'widget']);
    expect(security).toEqual(['profile', 'credential', 'passkeys', 'sessions', 'widget']);
  });

  it('adds a component from the preview: a widget with its text, and the next credential', () => {
    const widgetText = {heading: 'New widget', body: 'About this.'};

    const widget = addComponent(DEFAULT_TABS, {}, 'home', 'widget', 'en-US', widgetText);
    expect(widget?.sectionId).toBe('widget');
    expect(widget?.tabs[0].sections.at(-1)).toEqual({
      id: 'widget',
      type: 'widget',
      blocks: [
        {id: 'heading', type: 'heading'},
        {id: 'text', type: 'text'},
      ],
    });
    expect(widget?.text).toEqual({
      'en-US': {'sections.widget.heading': 'New widget', 'sections.widget.text': 'About this.'},
    });

    const credential = addComponent(DEFAULT_TABS, {}, 'security', 'credential', 'en-US', widgetText);
    expect(credential?.tabs[2].sections.at(-1)).toEqual({id: 'pin', type: 'credential', attribute: 'pin'});
  });

  it('adds nothing a tab cannot show, or to a full tab', () => {
    const widgetText = {heading: 'New widget', body: 'About this.'};
    const full: MyAccountTab[] = [
      {
        id: 'home',
        sections: Array.from({length: 20}, (_, index: number) => ({id: `w${index}`, type: 'widget' as const})),
      },
    ];

    expect(addComponent(DEFAULT_TABS, {}, 'home', 'passkeys', 'en-US', widgetText)).toBeUndefined();
    expect(addComponent(full, {}, 'home', 'widget', 'en-US', widgetText)).toBeUndefined();
    expect(addComponent(DEFAULT_TABS, {}, 'missing', 'widget', 'en-US', widgetText)).toBeUndefined();
  });

  it('adds blocks to a widget with unused IDs, and an empty address for an image or a button', () => {
    let widget = addBlock({id: 'w', type: 'widget', blocks: [{id: 'text', type: 'text'}]}, 'text');
    widget = addBlock(widget, 'button');

    expect(widget.blocks).toEqual([
      {id: 'text', type: 'text'},
      {id: 'text-2', type: 'text'},
      {id: 'button', type: 'button', url: ''},
    ]);
  });

  it("removes a component's text, or one block's, in every language", () => {
    const text = {
      'en-US': {'sections.w.heading': 'Hi', 'sections.w.text': 'Body', 'tabs.home': 'Home'},
      'de-DE': {'sections.w.heading': 'Hallo'},
    };

    expect(removeSectionText(text, 'w', 'heading')).toEqual({
      'en-US': {'sections.w.text': 'Body', 'tabs.home': 'Home'},
    });
    expect(removeSectionText(text, 'w')).toEqual({'en-US': {'tabs.home': 'Home'}});
  });

  it('makes an unused ID in the form the server accepts', () => {
    const used: Set<string> = usedIds(DEFAULT_TABS);

    expect(uniqueId('Help Center', used)).toBe('help-center');
    expect(uniqueId('Passkeys', used)).toBe('passkeys-2');
    expect(uniqueId('42 ways!', used)).toBe('ways');
    expect(uniqueId('!!!', used)).toBe('item');
    // A tab's address would be one of My Account's own files.
    expect(uniqueId('Assets', used)).toBe('assets-2');
  });

  it('sets text and removes it when emptied', () => {
    const text = setText({}, 'en-US', 'tabs.home', 'Overview');
    expect(text).toEqual({'en-US': {'tabs.home': 'Overview'}});
    expect(setText(text, 'en-US', 'tabs.home', '')).toEqual({});
  });

  it('says why a layout cannot be saved', () => {
    expect(layoutProblem(DEFAULT_TABS)).toBeUndefined();
    expect(layoutProblem(DEFAULT_TABS.map((tab) => ({...tab, hidden: true})))?.[0]).toBe('validation.noVisibleTab');
    expect(layoutProblem(addSection(DEFAULT_TABS, 'personal', {id: 'w', type: 'widget', blocks: []}))?.[0]).toBe(
      'validation.emptyWidget',
    );
    expect(
      layoutProblem(
        addSection(DEFAULT_TABS, 'personal', {
          id: 'w',
          type: 'widget',
          blocks: [{id: 'open', type: 'button', url: 'http://example.com'}],
        }),
      )?.[0],
    ).toBe('validation.invalidAddress');
    expect(layoutProblem(addSection(DEFAULT_TABS, 'personal', {id: 'c', type: 'credential', attribute: ''}))?.[0]).toBe(
      'validation.invalidAttribute',
    );
    expect(layoutProblem(addCustomTab(DEFAULT_TABS, 'Bad ID', {icon: 'info'}))?.[0]).toBe('validation.invalidId');
    expect(layoutProblem(DEFAULT_TABS, {'fr-FR': {'tabs.home': ''}})?.[0]).toBe('validation.unnamedTab');
  });

  it('reads the layout from the application metadata, and falls back to the default one', () => {
    const tabs: MyAccountTab[] = [{id: 'security', sections: []}];
    const text = {'en-US': {'tabs.security': 'Sign-in'}};

    expect(layoutOf({id: 'a', name: 'A', metadata: {myAccount: {tabs, text}}})).toEqual({tabs, text});
    expect(layoutOf({id: 'a', name: 'A', metadata: {myAccount: {tabs}}})).toEqual({tabs, text: {}});
    expect(layoutOf({id: 'a', name: 'A'})).toEqual({tabs: DEFAULT_TABS, text: {}});
    expect(layoutOf({id: 'a', name: 'A', metadata: {myAccount: 'home'}})).toEqual({tabs: DEFAULT_TABS, text: {}});
    expect(layoutOf({id: 'a', name: 'A', metadata: {myAccount: {tabs: 'home'}}})).toEqual({
      tabs: DEFAULT_TABS,
      text: {},
    });
  });
});
