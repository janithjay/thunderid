// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The layout My Account renders: its tabs, in order, and the components in each. It comes from the My
 * Account configuration of the application, set in the Control Plane console and served with the
 * application's flow metadata. Without one, My Account renders DEFAULT_TABS.
 */

export type BuiltInTabId = 'home' | 'personal' | 'security' | 'devices';

export type SectionType =
  | 'home.personalInfo'
  | 'home.securityCheckup'
  | 'home.devices'
  | 'home.apps'
  | 'profile'
  | 'credential'
  | 'passkeys'
  | 'sessions'
  | 'widget';

export type TabIcon = 'info' | 'help' | 'link' | 'star' | 'settings' | 'bell';

/** A block of a widget. Its text is `sections.<section id>.<block id>`. */
export type WidgetBlockType = 'heading' | 'text' | 'image' | 'button';

export interface WidgetBlock {
  id: string;
  type: WidgetBlockType;
  /** The https address of an image, or the page a button opens. */
  url?: string;
}

export interface AccountSection {
  attribute?: string;
  blocks?: WidgetBlock[];
  /** Kept in the layout for the editor, and left out of My Account. */
  hidden?: boolean;
  id: string;
  type: SectionType;
}

export interface AccountTab {
  custom?: boolean;
  hidden?: boolean;
  icon?: TabIcon;
  /** The https address of an image to show as the icon. */
  iconUrl?: string;
  id: string;
  sections: AccountSection[];
}

export const BUILT_IN_TABS: BuiltInTabId[] = ['home', 'personal', 'security', 'devices'];

export const DEFAULT_TABS: AccountTab[] = [
  {
    id: 'home',
    sections: [
      {id: 'personal-summary', type: 'home.personalInfo'},
      {id: 'security-checkup', type: 'home.securityCheckup'},
      {id: 'devices-summary', type: 'home.devices'},
      {id: 'apps-summary', type: 'home.apps'},
    ],
  },
  {id: 'personal', sections: [{id: 'profile', type: 'profile'}]},
  {
    id: 'security',
    sections: [
      {id: 'password', type: 'credential', attribute: 'password'},
      {id: 'passkeys', type: 'passkeys'},
    ],
  },
  {id: 'devices', sections: [{id: 'sessions', type: 'sessions'}]},
];

const SECTION_TYPES: ReadonlySet<string> = new Set<SectionType>([
  'home.personalInfo',
  'home.securityCheckup',
  'home.devices',
  'home.apps',
  'profile',
  'credential',
  'passkeys',
  'sessions',
  'widget',
]);

/** Whether a widget block can be shown: an image or a button only with an https address. */
export const isRenderableBlock = (block: WidgetBlock): boolean =>
  block.type === 'heading' || block.type === 'text' || (block.url ?? '').startsWith('https://');

/** Whether a value read from the server is a section this version of My Account can render. */
const isRenderable = (section: AccountSection): boolean =>
  SECTION_TYPES.has(section.type) && (section.type !== 'widget' || (section.blocks ?? []).some(isRenderableBlock));

/**
 * The tabs to show, in order: the configured ones that are not hidden, with their sections that are not hidden
 * and this version can render. Without a configuration, or with one that shows nothing, the default tabs. The
 * Console's preview keeps hidden tabs and sections, so they can still be picked and shown again.
 */
export function resolveTabs(configured: AccountTab[] | undefined, keepHidden = false): AccountTab[] {
  const tabs: AccountTab[] = (configured ?? [])
    .filter((tab: AccountTab) => keepHidden || !tab.hidden)
    .map((tab: AccountTab) => ({
      ...tab,
      sections: (tab.sections ?? []).filter(
        (section: AccountSection) => (keepHidden || !section.hidden) && isRenderable(section),
      ),
    }));

  return tabs.length > 0 ? tabs : DEFAULT_TABS;
}

/** Whether a tab is one My Account has without a configuration. */
export const isBuiltInTab = (id: string): id is BuiltInTabId => (BUILT_IN_TABS as string[]).includes(id);
