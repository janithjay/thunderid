// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import TabIcon from '../TabIcon';

vi.mock('@thunderid/react', () => ({UserIcon: () => <svg data-testid="user-icon" />}));

describe('TabIcon', () => {
  it('shows the image a tab was given, and its own icon once the image fails to load', () => {
    const {container} = render(
      <TabIcon tab={{id: 'personal', iconUrl: 'https://cdn.example.com/me.svg', sections: []}} />,
    );

    const image: HTMLImageElement = container.querySelector('img')!;
    expect(image).toHaveAttribute('src', 'https://cdn.example.com/me.svg');
    fireEvent.error(image);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="user-icon"]')).not.toBeNull();
  });

  it('shows a named icon given to a built-in tab instead of its own', () => {
    const {container} = render(<TabIcon tab={{id: 'personal', icon: 'star', sections: []}} />);

    expect(container.querySelector('[data-testid="user-icon"]')).toBeNull();
    expect(container.querySelector('svg path')).not.toBeNull();
  });
});
