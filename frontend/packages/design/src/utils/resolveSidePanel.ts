// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {LayoutSidePanel, SidePanelBlock, SidePanelPosition} from '../models/layout';

/** The attribute that marks a block in the Console's preview, so the element inspector leaves its clicks to the panel. */
export const SIDE_PANEL_BLOCK_ATTRIBUTE = 'data-side-panel-block';

/** The most blocks a side panel shows. */
export const MAX_SIDE_PANEL_BLOCKS = 12;

/** A block as the sign-in page shows it: its text trimmed, and only an address it can use. */
export interface ResolvedSidePanelBlock {
  id: string;
  type: SidePanelBlock['type'];
  text: string;
  /** For a text block, the link at its end. */
  link?: {text: string; url: string};
  url?: string;
}

/** The side panel as the sign-in page shows it. */
export interface ResolvedSidePanel {
  blocks: ResolvedSidePanelBlock[];
  position: SidePanelPosition;
  showOnSmallScreens: boolean;
}

/** Whether a value is an absolute https address with a host. */
export const isSidePanelLinkUrl = (value: string | undefined): boolean => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.host !== '';
  } catch {
    return false;
  }
};

/** Whether a value is a usable picture address: https, or a path on the server that serves the page. */
export const isSidePanelImageUrl = (value: string | undefined): boolean =>
  isSidePanelLinkUrl(value) || /^\/(?![/\\])\S*$/.test(value ?? '');

/**
 * A block ready to show, or null when it is missing what it needs: text for a label, heading, text or
 * button, and a usable address for a picture, a button or a store.
 */
export function resolveSidePanelBlock(block: SidePanelBlock): ResolvedSidePanelBlock | null {
  const text = block.text?.trim() ?? '';
  const base = {id: block.id, type: block.type, text};

  switch (block.type) {
    case 'label':
    case 'heading':
      return text === '' ? null : base;
    case 'text': {
      const linkText = block.linkText?.trim() ?? '';
      const link = linkText !== '' && isSidePanelLinkUrl(block.url) ? {text: linkText, url: block.url!} : undefined;
      return text === '' && !link ? null : {...base, link};
    }
    case 'image':
      return isSidePanelImageUrl(block.url) ? {...base, url: block.url} : null;
    case 'button':
      return text !== '' && isSidePanelLinkUrl(block.url) ? {...base, url: block.url} : null;
    case 'appStore':
    case 'googlePlay':
      return isSidePanelLinkUrl(block.url) ? {...base, url: block.url} : null;
    default:
      return null;
  }
}

/**
 * The side panel a layout configures, ready to show, or null when it is off or has no block to show. Blocks
 * missing what they need are left out, and at most MAX_SIDE_PANEL_BLOCKS are shown.
 */
export default function resolveSidePanel(panel: LayoutSidePanel | undefined | null): ResolvedSidePanel | null {
  if (!panel?.enabled) return null;

  const blocks = (Array.isArray(panel.blocks) ? panel.blocks : [])
    .slice(0, MAX_SIDE_PANEL_BLOCKS)
    .map(resolveSidePanelBlock)
    .filter((block): block is ResolvedSidePanelBlock => block !== null);

  if (blocks.length === 0) return null;

  return {
    blocks,
    position: panel.position === 'right' ? 'right' : 'left',
    showOnSmallScreens: panel.showOnSmallScreens === true,
  };
}
