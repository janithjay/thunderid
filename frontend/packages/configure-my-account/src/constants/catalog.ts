// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {MyAccountSectionType, MyAccountTab, MyAccountTabIcon} from '../models/my-account';

/**
 * A component a developer can add to a tab, with the name and description the editor shows for it.
 *
 * @public
 */
export interface SectionCatalogEntry {
  /** The name of the component that renders it in My Account, which the preview shows as code. */
  component: string;
  /** The translation key of the component's description, and its English fallback. */
  description: [string, string];
  /** Whether the component goes only in Home, or only in the other tabs. Widgets go anywhere. */
  home: boolean | 'any';
  /** The translation key of the component's name, and its English fallback. */
  name: [string, string];
  type: MyAccountSectionType;
}

/**
 * Every component a tab can show.
 *
 * @public
 */
export const SECTION_CATALOG: SectionCatalogEntry[] = [
  {
    type: 'home.personalInfo',
    component: 'PersonalInfoCard',
    home: true,
    name: ['catalog.homePersonalInfo.name', 'Personal info card'],
    description: ['catalog.homePersonalInfo.description', 'A summary of the name, email and phone.'],
  },
  {
    type: 'home.securityCheckup',
    component: 'SecurityCheckupCard',
    home: true,
    name: ['catalog.homeSecurityCheckup.name', 'Security checkup card'],
    description: ['catalog.homeSecurityCheckup.description', 'Recommendations that keep the account safe.'],
  },
  {
    type: 'home.devices',
    component: 'DevicesCard',
    home: true,
    name: ['catalog.homeDevices.name', 'Devices card'],
    description: ['catalog.homeDevices.description', 'The devices the user is signed in on.'],
  },
  {
    type: 'home.apps',
    component: 'AppsCard',
    home: true,
    name: ['catalog.homeApps.name', 'Apps card'],
    description: ['catalog.homeApps.description', 'The applications the user signed in to.'],
  },
  {
    type: 'profile',
    component: 'UserProfile',
    home: false,
    name: ['catalog.profile.name', 'Profile'],
    description: [
      'catalog.profile.description',
      'The user edits their profile, with the fields the user type defines.',
    ],
  },
  {
    type: 'credential',
    component: 'ChangeCredential',
    home: false,
    name: ['catalog.credential.name', 'Change credential'],
    description: ['catalog.credential.description', 'The user changes one credential, such as their password.'],
  },
  {
    type: 'passkeys',
    component: 'Passkeys',
    home: false,
    name: ['catalog.passkeys.name', 'Passkeys'],
    description: ['catalog.passkeys.description', 'The user adds and removes passkeys.'],
  },
  {
    type: 'sessions',
    component: 'ActiveSessions',
    home: false,
    name: ['catalog.sessions.name', 'Signed-in devices'],
    description: ['catalog.sessions.description', 'The user sees where they are signed in and signs out of devices.'],
  },
  {
    type: 'widget',
    component: 'CustomWidget',
    home: 'any',
    name: ['catalog.widget.name', 'Custom widget'],
    description: ['catalog.widget.description', 'A card you build from headings, text, images and buttons.'],
  },
];

/**
 * The tabs My Account has without a configuration, with their default names.
 *
 * @public
 */
export const BUILT_IN_TABS: Record<string, [string, string]> = {
  home: ['tabs.home', 'Home'],
  personal: ['tabs.personal', 'Personal info'],
  security: ['tabs.security', 'Security'],
  devices: ['tabs.devices', 'Devices'],
};

/**
 * The icons a custom tab can show.
 *
 * @public
 */
export const TAB_ICONS: MyAccountTabIcon[] = ['info', 'help', 'link', 'star', 'settings', 'bell'];

/**
 * My Account's layout without a configuration.
 *
 * @public
 */
export const DEFAULT_TABS: MyAccountTab[] = [
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

/** The limits the server enforces, so the editor refuses what a save would. */
export const MAX_TABS = 12;
export const MAX_SECTIONS_PER_TAB = 20;

export const MAX_WIDGET_BLOCKS = 10;

/** The form of a custom tab, section or widget block ID. */
export const ITEM_ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

/** The form of the credential attribute a credential component changes. */
export const CREDENTIAL_ATTRIBUTE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** The language whose text the editor opens on. */
export const DEFAULT_TEXT_LANGUAGE = 'en-US';
