// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  BUILT_IN_TABS,
  CREDENTIAL_ATTRIBUTE_PATTERN,
  DEFAULT_TABS,
  ITEM_ID_PATTERN,
  MAX_SECTIONS_PER_TAB,
  MAX_TABS,
  SECTION_CATALOG,
} from '../constants/catalog';
import type {SectionCatalogEntry} from '../constants/catalog';
import {
  MY_ACCOUNT_METADATA_KEY,
  type MyAccountApplication,
  type MyAccountLayout,
  type MyAccountSection,
  type MyAccountSectionType,
  type MyAccountTab,
  type MyAccountTabIcon,
  type MyAccountText,
  type MyAccountWidgetBlock,
  type MyAccountWidgetBlockType,
} from '../models/my-account';

/** An address an image or a button can use: https, with a host. */
export const HTTPS_URL_PATTERN = /^https:\/\/[^\s/]+/;

/**
 * The edits the My Account editor makes. Each returns a new layout and leaves the one it is given as it is.
 */

/**
 * Moves the item with an ID to just before another, or to the end when there is none. The preview leaves out
 * hidden tabs, so a drop there names the items it lands between rather than a position.
 */
export const moveBefore = <T extends {id: string}>(items: T[], id: string, beforeId: string | null): T[] => {
  const item: T | undefined = items.find((candidate: T) => candidate.id === id);
  if (!item || id === beforeId) {
    return items;
  }
  const rest: T[] = items.filter((candidate: T) => candidate.id !== id);
  const index: number = beforeId === null ? -1 : rest.findIndex((candidate: T) => candidate.id === beforeId);
  rest.splice(index === -1 ? rest.length : index, 0, item);
  return rest;
};

/** Changes one tab. */
const updateTab = (tabs: MyAccountTab[], tabId: string, update: (tab: MyAccountTab) => MyAccountTab): MyAccountTab[] =>
  tabs.map((tab: MyAccountTab) => (tab.id === tabId ? update(tab) : tab));

/** Shows a hidden tab, or hides a shown one. */
export const toggleTabHidden = (tabs: MyAccountTab[], tabId: string): MyAccountTab[] =>
  updateTab(tabs, tabId, (tab: MyAccountTab) => ({...tab, hidden: !tab.hidden}));

/** The icon a tab shows: a named one, or an image. */
export interface TabIconChoice {
  icon?: MyAccountTabIcon;
  iconUrl?: string;
}

/** Adds a custom tab at the end, with a named icon or an image. */
export const addCustomTab = (tabs: MyAccountTab[], id: string, choice: TabIconChoice): MyAccountTab[] => [
  ...tabs,
  {id, custom: true, ...(choice.iconUrl ? {iconUrl: choice.iconUrl} : {icon: choice.icon ?? 'info'}), sections: []},
];

/** Changes a tab's icon. A built-in tab given no icon shows its own again. */
export const setTabIcon = (tabs: MyAccountTab[], tabId: string, choice: TabIconChoice): MyAccountTab[] =>
  updateTab(tabs, tabId, (tab: MyAccountTab) => {
    const next: MyAccountTab = {...tab, icon: choice.icon, iconUrl: choice.iconUrl};
    if (!next.icon) delete next.icon;
    if (!next.iconUrl) delete next.iconUrl;
    return next;
  });

/** Removes a tab, built-in or custom. A removed built-in tab can be brought back. */
export const removeTab = (tabs: MyAccountTab[], tabId: string): MyAccountTab[] =>
  tabs.filter((tab: MyAccountTab) => tab.id !== tabId);

/** The built-in tabs the layout no longer has, in My Account's order. */
export const removedBuiltInTabs = (tabs: MyAccountTab[]): MyAccountTab[] =>
  DEFAULT_TABS.filter((builtIn: MyAccountTab) => !tabs.some((tab: MyAccountTab) => tab.id === builtIn.id));

/** Brings a removed built-in tab back at the end, with its components as My Account has them. */
export const restoreBuiltInTab = (tabs: MyAccountTab[], tabId: string): MyAccountTab[] => {
  const builtIn: MyAccountTab | undefined = removedBuiltInTabs(tabs).find((tab: MyAccountTab) => tab.id === tabId);
  return builtIn ? [...tabs, builtIn] : tabs;
};

/** Moves a component within its tab, to just before another or to the end. */
export const moveSection = (
  tabs: MyAccountTab[],
  tabId: string,
  sectionId: string,
  beforeId: string | null,
): MyAccountTab[] =>
  updateTab(tabs, tabId, (tab: MyAccountTab) => ({...tab, sections: moveBefore(tab.sections, sectionId, beforeId)}));

/** Changes one component of a tab. */
export const updateSection = (
  tabs: MyAccountTab[],
  tabId: string,
  sectionId: string,
  update: (section: MyAccountSection) => MyAccountSection,
): MyAccountTab[] =>
  updateTab(tabs, tabId, (tab: MyAccountTab) => ({
    ...tab,
    sections: tab.sections.map((section: MyAccountSection) => (section.id === sectionId ? update(section) : section)),
  }));

/** Removes a component from its tab. */
export const removeSection = (tabs: MyAccountTab[], tabId: string, sectionId: string): MyAccountTab[] =>
  updateTab(tabs, tabId, (tab: MyAccountTab) => ({
    ...tab,
    sections: tab.sections.filter((section: MyAccountSection) => section.id !== sectionId),
  }));

/** Adds a component at the end of a tab. */
export const addSection = (tabs: MyAccountTab[], tabId: string, section: MyAccountSection): MyAccountTab[] =>
  updateTab(tabs, tabId, (tab: MyAccountTab) => ({...tab, sections: [...tab.sections, section]}));

/** The components a tab can show: the Home cards in Home, the other components elsewhere, and widgets anywhere. */
export const allowedSections = (tab: MyAccountTab): SectionCatalogEntry[] => {
  const home: boolean = tab.id === 'home' && !tab.custom;
  return SECTION_CATALOG.filter((entry: SectionCatalogEntry) => entry.home === 'any' || entry.home === home);
};

/** IDs a tab cannot have, since its address in My Account would be one of the app's own files. */
// My Account's own files, and the built-in tabs, whose IDs a custom tab must not take even once they are removed.
const RESERVED_IDS: string[] = ['assets', ...Object.keys(BUILT_IN_TABS)];

/** Every section and tab ID in the layout, and the reserved ones, which a new one must not reuse. */
export const usedIds = (tabs: MyAccountTab[]): Set<string> =>
  new Set([
    ...RESERVED_IDS,
    ...tabs.flatMap((tab: MyAccountTab) => [tab.id, ...tab.sections.map((section) => section.id)]),
  ]);

/** An ID in the form the server accepts, made from a name and not yet used. */
export const uniqueId = (name: string, used: Set<string>): string => {
  const base: string =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^[^a-z]+|-+$/g, '')
      .slice(0, 28) || 'item';
  let id: string = base;
  for (let suffix = 2; used.has(id); suffix += 1) {
    id = `${base}-${suffix}`;
  }
  return id;
};

/** The text a new widget opens with, in the language being edited. */
export interface NewWidgetText {
  body: string;
  heading: string;
}

/** What adding a component changed: the layout, its text, and the new component's ID. */
export interface AddedComponent {
  sectionId: string;
  tabs: MyAccountTab[];
  text: MyAccountText;
}

/**
 * Adds a component at the end of a tab, as the preview's add space asks: a credential component changes the
 * password, or the PIN when the tab already has one for the password, and a widget opens with a heading and
 * some text. Nothing is added when the tab is full or cannot show the component.
 */
export const addComponent = (
  tabs: MyAccountTab[],
  text: MyAccountText,
  tabId: string,
  type: MyAccountSectionType,
  language: string,
  widgetText: NewWidgetText,
): AddedComponent | undefined => {
  const tab: MyAccountTab | undefined = tabs.find((item: MyAccountTab) => item.id === tabId);
  if (
    !tab ||
    tab.sections.length >= MAX_SECTIONS_PER_TAB ||
    !allowedSections(tab).some((entry: SectionCatalogEntry) => entry.type === type)
  ) {
    return undefined;
  }
  const used: Set<string> = usedIds(tabs);
  let section: MyAccountSection;
  let nextText: MyAccountText = text;
  if (type === 'credential') {
    const changed = new Set<string | undefined>(tab.sections.map((item: MyAccountSection) => item.attribute));
    const attribute: string = changed.has('password') ? 'pin' : 'password';
    section = {id: uniqueId(attribute, used), type, attribute};
  } else if (type === 'widget') {
    const id: string = uniqueId('widget', used);
    section = {
      id,
      type,
      blocks: [
        {id: 'heading', type: 'heading'},
        {id: 'text', type: 'text'},
      ],
    };
    nextText = setText(nextText, language, `sections.${id}.heading`, widgetText.heading);
    nextText = setText(nextText, language, `sections.${id}.text`, widgetText.body);
  } else {
    section = {id: uniqueId(type.replace('home.', ''), used), type};
  }
  return {tabs: addSection(tabs, tabId, section), text: nextText, sectionId: section.id};
};

/** Adds a block at the end of a widget, with an ID unused in it. */
export const addBlock = (widget: MyAccountSection, type: MyAccountWidgetBlockType): MyAccountSection => {
  const blocks: MyAccountWidgetBlock[] = widget.blocks ?? [];
  const id: string = uniqueId(type, new Set(blocks.map((block: MyAccountWidgetBlock) => block.id)));
  return {...widget, blocks: [...blocks, type === 'image' || type === 'button' ? {id, type, url: ''} : {id, type}]};
};

/** Every text key a component's text is kept under, so removing it can drop its text too. */
const sectionTextPrefix = (sectionId: string): string => `sections.${sectionId}.`;

/** Removes the text of one component, or of one block of it, in every language. */
export const removeSectionText = (text: MyAccountText, sectionId: string, blockId?: string): MyAccountText => {
  const prefix: string = blockId ? `${sectionTextPrefix(sectionId)}${blockId}` : sectionTextPrefix(sectionId);
  const next: MyAccountText = {};
  Object.entries(text).forEach(([language, values]: [string, Record<string, string>]) => {
    const kept: [string, string][] = Object.entries(values).filter(([key]: [string, string]) =>
      blockId ? key !== prefix : !key.startsWith(prefix),
    );
    if (kept.length > 0) {
      next[language] = Object.fromEntries(kept);
    }
  });
  return next;
};

/** Shows a hidden component, or hides a shown one. */
export const toggleSectionHidden = (tabs: MyAccountTab[], tabId: string, sectionId: string): MyAccountTab[] =>
  updateSection(tabs, tabId, sectionId, (section: MyAccountSection) => ({...section, hidden: !section.hidden}));

/** Sets one piece of text in one language. An empty value removes it, so My Account's own text shows. */
export const setText = (text: MyAccountText, language: string, key: string, value: string): MyAccountText => {
  const values: Record<string, string> = {...(text[language] ?? {})};
  if (value) {
    values[key] = value;
  } else {
    delete values[key];
  }
  const next: MyAccountText = {...text, [language]: values};
  if (Object.keys(values).length === 0) {
    delete next[language];
  }
  return next;
};

/**
 * Sets one piece of text in one language, as a field showing My Account's own text edits it: the field's value
 * equal to My Account's own text keeps no text of its own, so My Account's text shows, and any other value, even
 * an empty one, is kept. Without My Account's own text, every value is kept.
 */
export const setOwnText = (
  text: MyAccountText,
  language: string,
  key: string,
  value: string,
  defaultValue: string | undefined,
): MyAccountText =>
  value === defaultValue
    ? setText(text, language, key, '')
    : {...text, [language]: {...(text[language] ?? {}), [key]: value}};

/**
 * Why a layout cannot be saved, as a translation key and its English fallback, or nothing when it can. The server
 * leaves out a layout that breaks these rules, and My Account then shows its default tabs, so the editor checks
 * them before a save.
 */
export const layoutProblem = (tabs: MyAccountTab[], text: MyAccountText = {}): [string, string] | undefined => {
  if (!tabs.some((tab: MyAccountTab) => !tab.hidden)) {
    return ['validation.noVisibleTab', 'Show at least one tab.'];
  }
  const unnamed: boolean = Object.values(text).some((values: Record<string, string>) =>
    tabs.some((tab: MyAccountTab) => values[`tabs.${tab.id}`] === ''),
  );
  if (unnamed) {
    return ['validation.unnamedTab', 'Give every menu item a name.'];
  }
  if (tabs.length > MAX_TABS) {
    return ['validation.tooManyTabs', 'My Account can have at most 12 tabs.'];
  }
  if (tabs.some((tab: MyAccountTab) => tab.sections.length > MAX_SECTIONS_PER_TAB)) {
    return ['validation.tooManySections', 'A tab can have at most 20 components.'];
  }
  const invalidId: boolean = tabs.some(
    (tab: MyAccountTab) =>
      !ITEM_ID_PATTERN.test(tab.id) ||
      tab.sections.some((section: MyAccountSection) => !ITEM_ID_PATTERN.test(section.id)),
  );
  if (invalidId) {
    return ['validation.invalidId', 'A tab or component has an invalid ID.'];
  }
  const invalidAttribute: boolean = tabs.some((tab: MyAccountTab) =>
    tab.sections.some(
      (section: MyAccountSection) =>
        section.type === 'credential' && !CREDENTIAL_ATTRIBUTE_PATTERN.test(section.attribute ?? ''),
    ),
  );
  if (invalidAttribute) {
    return ['validation.invalidAttribute', 'Every credential component needs a credential attribute.'];
  }
  const widgets: MyAccountSection[] = tabs.flatMap((tab: MyAccountTab) =>
    tab.sections.filter((section: MyAccountSection) => section.type === 'widget'),
  );
  if (widgets.some((widget: MyAccountSection) => (widget.blocks ?? []).length === 0)) {
    return ['validation.emptyWidget', 'Every widget needs at least one block.'];
  }
  const invalidAddress: boolean = widgets.some((widget: MyAccountSection) =>
    (widget.blocks ?? []).some(
      (block: MyAccountWidgetBlock) =>
        (block.type === 'image' || block.type === 'button') && !HTTPS_URL_PATTERN.test(block.url ?? ''),
    ),
  );
  if (invalidAddress) {
    return ['validation.invalidAddress', 'Every image and button needs an address that starts with https://.'];
  }
  if (tabs.some((tab: MyAccountTab) => tab.iconUrl !== undefined && !HTTPS_URL_PATTERN.test(tab.iconUrl))) {
    return ['validation.invalidIcon', 'Every menu item icon needs an image address that starts with https://.'];
  }
  return undefined;
};

/**
 * The layout an application's metadata holds, or My Account's default one when it holds none.
 */
export const layoutOf = (application: MyAccountApplication): Required<MyAccountLayout> => {
  const stored: unknown = application.metadata?.[MY_ACCOUNT_METADATA_KEY];
  if (typeof stored !== 'object' || stored === null || !Array.isArray((stored as MyAccountLayout).tabs)) {
    return {tabs: DEFAULT_TABS, text: {}};
  }
  const {tabs, text} = stored as MyAccountLayout;
  return {tabs, text: typeof text === 'object' && text !== null ? text : {}};
};
