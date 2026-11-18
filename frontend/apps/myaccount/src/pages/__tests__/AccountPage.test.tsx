// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render, screen, within} from '@testing-library/react';
import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {AccountTab} from '../../layout/accountLayout';
import AccountPage from '../AccountPage';

const state: {tabs: AccountTab[] | undefined} = {tabs: undefined};

vi.mock('@thunderid/react', () => ({
  ActiveSessions: () => <div>ActiveSessions</div>,
  Button: ({children, startIcon = null, ...props}: {children: ReactNode; startIcon?: ReactNode}) => (
    <button type="button" {...props}>
      {startIcon}
      {children}
    </button>
  ),
  Card: ({children, className = ''}: {children: ReactNode; className?: string}) => (
    <div className={className}>{children}</div>
  ),
  ChangeCredential: ({attribute = ''}: {attribute?: string}) => <div>ChangeCredential {attribute}</div>,
  Passkeys: () => <div>Passkeys</div>,
  Typography: ({children}: {children: ReactNode}) => <div>{children}</div>,
  UserIcon: () => <svg />,
  UserProfile: () => <div>UserProfile</div>,
  useThunderID: () => ({meta: state.tabs ? {myAccount: {tabs: state.tabs}} : null}),
}));

vi.mock('../../components/AccountHome', () => ({
  default: ({sections}: {sections: {id: string}[]}): ReactElement => (
    <div>Home cards: {sections.map((section) => section.id).join(', ')}</div>
  ),
}));

// Where the page is, as the address bar shows it under the app's path.
function CurrentPath(): ReactElement {
  return <output aria-label="Path">{useLocation().pathname}</output>;
}

const renderPage = (path = '/home'): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:tabId" element={<AccountPage />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );
};

const currentPath = (): string => screen.getByRole('status', {name: 'Path'}).textContent ?? '';

const navLabels = (): string[] =>
  within(screen.getByRole('navigation'))
    .getAllByRole('button')
    .map((button: HTMLElement) => button.textContent ?? '');

describe('AccountPage', () => {
  beforeEach(() => {
    state.tabs = undefined;
  });

  it('shows the default tabs and Home without a configuration', () => {
    renderPage();

    expect(navLabels()).toEqual(['Home', 'Personal info', 'Security', 'Devices']);
    expect(screen.getByText(/Home cards: personal-summary/)).toBeInTheDocument();
  });

  it('follows the configuration: order, hidden tabs, added components and a custom tab', () => {
    state.tabs = [
      {id: 'home', hidden: true, sections: []},
      {
        id: 'security',
        sections: [
          {id: 'pin', type: 'credential', attribute: 'pin'},
          {id: 'passkeys', type: 'passkeys'},
        ],
      },
      {
        id: 'help',
        custom: true,
        icon: 'help',
        sections: [{id: 'support', type: 'widget', blocks: [{id: 'open', type: 'button', url: 'https://example.com'}]}],
      },
    ];
    renderPage();

    expect(navLabels()).toEqual(['Security', 'help']);
    // With Home hidden, My Account opens on the first visible tab.
    expect(screen.getByText('ChangeCredential pin')).toBeInTheDocument();
    expect(screen.getByText('Passkeys')).toBeInTheDocument();
    expect(screen.queryByText('UserProfile')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'help'}));

    const link: HTMLElement = screen.getByRole('link', {name: /Open/});
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens the tab the address names, and gives each tab its own address', () => {
    renderPage('/devices');

    expect(screen.getByText('ActiveSessions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Security'}));

    expect(currentPath()).toBe('/security');
    expect(screen.getByText('Passkeys')).toBeInTheDocument();
  });

  it('opens the first tab for an address no shown tab has', () => {
    state.tabs = [
      {id: 'home', hidden: true, sections: []},
      {id: 'security', sections: [{id: 'passkeys', type: 'passkeys'}]},
    ];
    renderPage('/home');

    expect(currentPath()).toBe('/security');
    expect(screen.getByText('Passkeys')).toBeInTheDocument();
  });
});
