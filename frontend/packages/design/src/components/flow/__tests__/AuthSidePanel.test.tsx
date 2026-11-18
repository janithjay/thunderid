// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render, screen} from '@thunderid/test-utils';
import {describe, expect, it, vi} from 'vitest';
import type {LayoutSidePanel} from '../../../models/layout';
import AuthSidePanel from '../AuthSidePanel';

const PANEL: LayoutSidePanel = {
  enabled: true,
  showOnSmallScreens: true,
  blocks: [
    {id: 'label-1', type: 'label', text: 'My BT'},
    {id: 'heading-1', type: 'heading', text: 'A higher standard of convenience.'},
    {id: 'text-1', type: 'text', text: 'Get the app.', linkText: 'Find out more', url: 'https://example.com/app'},
    {id: 'appStore-1', type: 'appStore', url: 'https://apps.apple.com/app/id1'},
    {id: 'googlePlay-1', type: 'googlePlay', url: 'https://play.google.com/store/apps/details?id=a'},
    {id: 'image-1', type: 'image', url: 'https://example.com/photo.jpg', text: 'A customer using the app'},
    {id: 'button-1', type: 'button', text: 'Learn more', url: 'https://example.com/learn'},
  ],
};

describe('AuthSidePanel', () => {
  it('renders nothing when the panel is off', () => {
    const {container} = render(<AuthSidePanel panel={{...PANEL, enabled: false}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows each block the layout sets, in order', () => {
    const {container} = render(<AuthSidePanel panel={PANEL} />);

    expect(screen.getByText('My BT')).toBeInTheDocument();
    expect(screen.getByText('A higher standard of convenience.')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Find out more/})).toHaveAttribute('href', 'https://example.com/app');
    expect(screen.getByRole('img', {name: 'A customer using the app'})).toHaveAttribute(
      'src',
      'https://example.com/photo.jpg',
    );
    expect(screen.getByRole('link', {name: /Learn more/})).toHaveAttribute('href', 'https://example.com/learn');

    const appStore = screen.getByRole('link', {name: /App Store/});
    expect(appStore).toHaveAttribute('target', '_blank');
    expect(appStore).toHaveAttribute('rel', 'noopener noreferrer');

    // The two store badges share one list.
    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('in the preview, selects a clicked block instead of following its link', () => {
    const onSelectBlock = vi.fn();
    const {container} = render(
      <AuthSidePanel panel={PANEL} onSelectBlock={onSelectBlock} selectedBlockId="heading-1" />,
    );

    fireEvent.click(container.querySelector('a[href="https://example.com/learn"]')!);

    expect(onSelectBlock).toHaveBeenCalledWith('button-1');
  });

  it('leaves out a picture that fails to load on the live page', () => {
    const panel: LayoutSidePanel = {
      enabled: true,
      showOnSmallScreens: true,
      blocks: [{id: 'image-1', type: 'image', url: 'https://example.com/missing.jpg', text: 'Broken'}],
    };
    const {container} = render(<AuthSidePanel panel={panel} />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain("can't load");
  });

  it('keeps a placeholder for a picture that fails to load in the preview', () => {
    const panel: LayoutSidePanel = {
      enabled: true,
      showOnSmallScreens: true,
      blocks: [{id: 'image-1', type: 'image', url: 'https://example.com/missing.jpg', text: 'Broken'}],
    };
    const {container} = render(<AuthSidePanel panel={panel} onSelectBlock={vi.fn()} />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.textContent).toContain("This picture can't load here.");
  });
});
