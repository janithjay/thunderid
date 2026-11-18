// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AccountTab} from '../layout/accountLayout';

/**
 * The messages the Console's My Account editor and this preview exchange. The Console writes the preview into
 * a frame of its own page, so both run on the Console's origin, and each side accepts messages only from the
 * other window on that origin.
 */
export const PREVIEW_MESSAGE_SOURCE = 'thunderid-myaccount-preview';

/** What is selected in the editor: a tab, or a component in it. */
export interface PreviewSelection {
  sectionId?: string;
  tabId: string;
}

/** Where a control of the preview is, in the frame's viewport, so the editor can open a menu beside it. */
export interface PreviewAnchor {
  height: number;
  left: number;
  top: number;
  width: number;
}

/** How the preview should look: the layout and text being edited, and the application's brand. */
export interface PreviewState {
  /** The color the preview outlines and names a hovered or selected region in. */
  accent: string;
  application: {logoUrl?: string; name: string};
  colorScheme: 'light' | 'dark';
  /** The application's design theme, as the flow metadata carries it, or null when it has none. */
  designTheme: unknown;
  /** Whether the layout can be changed, so tabs and components can be dragged and added. */
  editable: boolean;
  /** The names to show for each tab and component, by `tab:<id>` and `section:<id>`. */
  labels: Record<string, string>;
  language: string;
  selection: PreviewSelection;
  /** The editor's text for the preview's own controls, and the mark on a hidden tab or component. */
  strings: {addComponent: string; addTab: string; hidden: string};
  tabs: AccountTab[];
  /** The text being edited for `language`, by key, over My Account's own. */
  text: Record<string, string>;
}

/**
 * What the preview asks the editor to do: open its menu of components to add to a tab, beside the add space, open
 * its form to add a tab, beside the menu's add button, or move a tab or a component. A move names the item it
 * lands before, or null for the end.
 */
export type PreviewChange =
  | {anchor: PreviewAnchor; tabId: string; type: 'openAdd'}
  | {anchor: PreviewAnchor; type: 'openAddTab'}
  | {beforeId: string | null; id: string; type: 'moveTab'}
  | {beforeId: string | null; id: string; tabId: string; type: 'moveSection'};

export type PreviewMessage =
  | {source: typeof PREVIEW_MESSAGE_SOURCE; type: 'ready'}
  | {source: typeof PREVIEW_MESSAGE_SOURCE; type: 'select'; selection: PreviewSelection}
  | {source: typeof PREVIEW_MESSAGE_SOURCE; type: 'state'; state: PreviewState}
  | (PreviewChange & {source: typeof PREVIEW_MESSAGE_SOURCE});
