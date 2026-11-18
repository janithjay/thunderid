// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The type of a component My Account can show in a tab.
 *
 * @public
 */
export type MyAccountSectionType =
  | 'home.personalInfo'
  | 'home.securityCheckup'
  | 'home.devices'
  | 'home.apps'
  | 'profile'
  | 'credential'
  | 'passkeys'
  | 'sessions'
  | 'widget';

/**
 * An icon a custom tab can show.
 *
 * @public
 */
export type MyAccountTabIcon = 'info' | 'help' | 'link' | 'star' | 'settings' | 'bell';

/**
 * The kind of a block a widget is built from.
 *
 * @public
 */
export type MyAccountWidgetBlockType = 'heading' | 'text' | 'image' | 'button';

/**
 * One block of a widget. Its text, by language, is the layout's text for `sections.<section id>.<block id>`: a
 * heading's or text block's text, a button's label, or an image's description.
 *
 * @public
 */
export interface MyAccountWidgetBlock {
  id: string;
  type: MyAccountWidgetBlockType;
  /** The https address of an image, or the page a button opens. */
  url?: string;
}

/**
 * One component in a tab: a ready-made one, or a widget built from blocks.
 *
 * @public
 */
export interface MyAccountSection {
  attribute?: string;
  /** The blocks of a widget, in order. */
  blocks?: MyAccountWidgetBlock[];
  /** Kept in the layout, and left out of My Account. */
  hidden?: boolean;
  id: string;
  type: MyAccountSectionType;
}

/**
 * One tab of My Account.
 *
 * @public
 */
export interface MyAccountTab {
  custom?: boolean;
  hidden?: boolean;
  icon?: MyAccountTabIcon;
  /** The https address of an image to show as the icon, over `icon`. */
  iconUrl?: string;
  id: string;
  sections: MyAccountSection[];
}

/**
 * Text that replaces My Account's own, by language and then by key.
 *
 * @public
 */
export type MyAccountText = Record<string, Record<string, string>>;

/**
 * How My Account is laid out: its tabs, and its text by language. An application holds it in its metadata, under
 * {@link MY_ACCOUNT_METADATA_KEY}, and My Account reads it from there.
 *
 * @public
 */
export interface MyAccountLayout {
  tabs: MyAccountTab[];
  text?: MyAccountText;
}

/**
 * The metadata key that holds the My Account layout of an application.
 *
 * @public
 */
export const MY_ACCOUNT_METADATA_KEY = 'myAccount';

/**
 * An application as the application API returns it, with the fields this package reads. The rest is kept as it
 * is, so that saving the layout leaves the application's other settings unchanged.
 *
 * @public
 */
export interface MyAccountApplication {
  [field: string]: unknown;
  id: string;
  isReadOnly?: boolean;
  metadata?: Record<string, unknown>;
  name: string;
  themeId?: string;
}
