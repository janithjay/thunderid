// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {describe, expect, it, vi} from 'vitest';
import type {AccountSection} from '../../layout/accountLayout';
import CustomWidget from '../CustomWidget';

const TEXT: Record<string, string> = {
  'sections.alert.title': 'Protect your account',
  'sections.alert.body': 'Never share a code.\nWe never ask for one.',
  'sections.alert.banner': 'A phone with a padlock',
  'sections.alert.more': 'Learn more',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string, fallback: string) => TEXT[key] ?? fallback}),
}));

vi.mock('@thunderid/react', () => ({
  Card: ({children, className = ''}: {children: ReactNode; className?: string}) => (
    <div className={className}>{children}</div>
  ),
  Typography: ({children, className = ''}: {children: ReactNode; className?: string}) => (
    <div className={className}>{children}</div>
  ),
}));

const WIDGET: AccountSection = {
  id: 'alert',
  type: 'widget',
  blocks: [
    {id: 'title', type: 'heading'},
    {id: 'body', type: 'text'},
    {id: 'banner', type: 'image', url: 'https://example.com/banner.png'},
    {id: 'more', type: 'button', url: 'https://example.com/help'},
    {id: 'call', type: 'button', url: 'https://example.com/call'},
  ],
};

describe('CustomWidget', () => {
  it('renders its blocks in order, with their text', () => {
    const {container} = render(<CustomWidget section={WIDGET} />);

    expect(screen.getByText('Protect your account')).toBeInTheDocument();
    expect(screen.getByText(/Never share a code/)).toBeInTheDocument();
    expect(screen.getByRole('img', {name: 'A phone with a padlock'})).toHaveAttribute(
      'src',
      'https://example.com/banner.png',
    );
    expect(container.textContent?.indexOf('Protect')).toBeLessThan(container.textContent?.indexOf('Never') ?? 0);
  });

  it('opens a button in a new tab, and names an unlabeled one', () => {
    render(<CustomWidget section={WIDGET} />);

    const more: HTMLElement = screen.getByRole('link', {name: 'Learn more'});
    expect(more).toHaveAttribute('href', 'https://example.com/help');
    expect(more).toHaveAttribute('target', '_blank');
    expect(more).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', {name: 'Open'})).toHaveAttribute('href', 'https://example.com/call');
  });

  it('leaves out an image or a button without an https address', () => {
    render(
      <CustomWidget
        section={{
          id: 'alert',
          type: 'widget',
          blocks: [
            {id: 'title', type: 'heading'},
            {id: 'banner', type: 'image', url: 'http://example.com/banner.png'},
            {id: 'more', type: 'button', url: 'javascript:alert(1)'},
          ],
        }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the place of an image that cannot load', () => {
    render(<CustomWidget section={WIDGET} />);

    fireEvent.error(screen.getByRole('img', {name: 'A phone with a padlock'}));

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
  });
});
