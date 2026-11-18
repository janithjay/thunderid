// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {sectionTag, tabLabel, textFor, type Translate} from './labels';
import type {MyAccountSection, MyAccountTab, MyAccountText} from '../models/my-account';

/**
 * The messages this editor and My Account's preview exchange. The preview is written into a frame of the
 * Console's page, so both run on the Console's origin, and each side accepts messages only from the other
 * window on that origin. My Account's `src/preview/protocol.ts` defines the same messages.
 */
export const PREVIEW_MESSAGE_SOURCE = 'thunderid-myaccount-preview';

/** What is selected: a tab, or a component in it. */
export interface PreviewSelection {
  sectionId?: string;
  tabId: string;
}

/** The editor's text the preview shows on its own controls, and the mark on a hidden tab or component. */
export interface PreviewStrings {
  addComponent: string;
  addTab: string;
  hidden: string;
}

/** Where a control of the preview is, in the frame's viewport. */
export interface PreviewAnchor {
  height: number;
  left: number;
  top: number;
  width: number;
}

/** How the preview should look: the layout and text being edited, and the application's brand. */
export interface PreviewState {
  accent: string;
  application: {logoUrl?: string; name: string};
  colorScheme: 'light' | 'dark';
  designTheme: unknown;
  /** Whether the layout can be changed, so the preview offers dragging and adding. */
  editable: boolean;
  labels: Record<string, string>;
  language: string;
  selection: PreviewSelection;
  strings: PreviewStrings;
  tabs: MyAccountTab[];
  text: Record<string, string>;
}

/**
 * A message from the preview. Its add space asks for the menu of components beside it, and its button under the
 * menu for the form that adds a menu item; a move names the item it lands before, or null for the end.
 */
export type PreviewMessage =
  | {source: typeof PREVIEW_MESSAGE_SOURCE; type: 'ready'}
  | {selection: PreviewSelection; source: typeof PREVIEW_MESSAGE_SOURCE; type: 'select'}
  | {anchor: PreviewAnchor; source: typeof PREVIEW_MESSAGE_SOURCE; tabId: string; type: 'openAdd'}
  | {anchor: PreviewAnchor; source: typeof PREVIEW_MESSAGE_SOURCE; type: 'openAddTab'}
  | {beforeId: string | null; id: string; source: typeof PREVIEW_MESSAGE_SOURCE; type: 'moveTab'}
  | {beforeId: string | null; id: string; source: typeof PREVIEW_MESSAGE_SOURCE; tabId: string; type: 'moveSection'};

interface PreviewStateInput extends Omit<PreviewState, 'labels' | 'strings' | 'text'> {
  t: Translate;
  text: MyAccountText;
}

/**
 * The state the preview renders: the draft's tabs and its text for the language, with the name the preview shows
 * on each tab and component while it is hovered or selected. A component is named as code, by the component that
 * renders it, such as `<Passkeys />`.
 */
export const buildPreviewState = ({t, text, ...state}: PreviewStateInput): PreviewState => {
  const labels: Record<string, string> = {};
  state.tabs.forEach((tab: MyAccountTab) => {
    labels[`tab:${tab.id}`] = t('preview.tabLabel', 'Menu item: {{name}}').replace(
      '{{name}}',
      tabLabel(t, tab, text, state.language),
    );
    tab.sections.forEach((section: MyAccountSection) => {
      labels[`section:${section.id}`] = sectionTag(section);
    });
  });
  const strings: PreviewStrings = {
    addComponent: t('preview.addComponent', 'Add component'),
    addTab: t('layout.addTab', 'Add new feature'),
    hidden: t('layout.hidden', 'Hidden'),
  };
  return {...state, labels, strings, text: textFor(text, state.language)};
};
