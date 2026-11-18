// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import resolveSidePanel, {
  isSidePanelImageUrl,
  isSidePanelLinkUrl,
  MAX_SIDE_PANEL_BLOCKS,
  resolveSidePanelBlock,
} from '../resolveSidePanel';

describe('resolveSidePanel', () => {
  it('shows nothing when the panel is off, missing, or has no block to show', () => {
    expect(resolveSidePanel(undefined)).toBeNull();
    expect(resolveSidePanel({enabled: false, blocks: [{id: 'h', type: 'heading', text: 'Hi'}]})).toBeNull();
    expect(resolveSidePanel({enabled: true})).toBeNull();
    expect(resolveSidePanel({enabled: true, blocks: [{id: 'h', type: 'heading', text: '   '}]})).toBeNull();
  });

  it('keeps the blocks in order, trimmed, on the left and hidden on phones by default', () => {
    expect(
      resolveSidePanel({
        enabled: true,
        blocks: [
          {id: 'l', type: 'label', text: ' My BT '},
          {id: 'h', type: 'heading', text: 'A higher standard'},
        ],
      }),
    ).toEqual({
      position: 'left',
      showOnSmallScreens: false,
      blocks: [
        {id: 'l', type: 'label', text: 'My BT'},
        {id: 'h', type: 'heading', text: 'A higher standard'},
      ],
    });
  });

  it('leaves out blocks missing what they need', () => {
    const resolved = resolveSidePanel({
      enabled: true,
      position: 'right',
      blocks: [
        {id: 'img', type: 'image', url: '/gate/assets/images/photo.jpg', text: 'A customer'},
        {id: 'bad-img', type: 'image', url: '//evil.example.com/a.jpg'},
        {id: 'apple', type: 'appStore', url: 'https://apps.apple.com/app/id1'},
        {id: 'play', type: 'googlePlay', url: 'http://play.google.com'},
        {id: 'btn', type: 'button', url: 'https://example.com'},
      ],
    });

    expect(resolved?.position).toBe('right');
    expect(resolved?.blocks.map((block) => block.id)).toEqual(['img', 'apple']);
  });

  it('shows at most the maximum number of blocks', () => {
    const blocks = Array.from({length: MAX_SIDE_PANEL_BLOCKS + 3}, (_, i) => ({
      id: `h-${i}`,
      type: 'heading' as const,
      text: `Heading ${i}`,
    }));

    expect(resolveSidePanel({enabled: true, blocks})?.blocks).toHaveLength(MAX_SIDE_PANEL_BLOCKS);
  });
});

describe('resolveSidePanelBlock', () => {
  it('keeps a text block link only with both its text and an https address', () => {
    expect(
      resolveSidePanelBlock({id: 't', type: 'text', text: 'Get the app.', linkText: 'More', url: 'https://x.com'})
        ?.link,
    ).toEqual({text: 'More', url: 'https://x.com'});
    expect(resolveSidePanelBlock({id: 't', type: 'text', text: 'Hi', url: 'https://x.com'})?.link).toBeUndefined();
    expect(resolveSidePanelBlock({id: 't', type: 'text', linkText: 'More', url: 'javascript:alert(1)'})).toBeNull();
  });

  it('checks addresses', () => {
    expect(isSidePanelLinkUrl('https://example.com')).toBe(true);
    expect(isSidePanelLinkUrl('http://example.com')).toBe(false);
    expect(isSidePanelLinkUrl('not a url')).toBe(false);
    expect(isSidePanelImageUrl('/gate/a.jpg')).toBe(true);
    expect(isSidePanelImageUrl('//evil.example.com/a.jpg')).toBe(false);
    expect(isSidePanelImageUrl('data:image/png;base64,AAA')).toBe(false);
  });
});
