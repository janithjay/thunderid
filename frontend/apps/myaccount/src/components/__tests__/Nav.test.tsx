// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen} from '@testing-library/react';
import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Nav from '../Nav';

const state: {isMetaLoading: boolean; meta: unknown} = {isMetaLoading: true, meta: null};

vi.mock('@thunderid/react', () => ({
  Loading: () => null,
  SignedIn: () => null,
  SignedOut: () => null,
  SignInButton: () => null,
  UserDropdown: () => null,
  resolveLogoUri: (url: string) => ({imgSrc: url, kind: 'image'}),
  useTheme: () => ({colorScheme: 'light'}),
  useThunderID: () => state,
}));

vi.mock('../../config/runtimeConfig', () => ({getRuntimeConfig: () => ({client: {application_id: 'app-1'}})}));

vi.mock('../../i18n/useServerTranslations', () => ({default: () => undefined}));

vi.mock('../AppShell', () => ({
  default: ({children, name}: {children: ReactNode; name: string}): ReactElement => (
    <div>
      <h1>{name}</h1>
      {children}
    </div>
  ),
}));

const renderNav = (): void => {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Nav />}>
          <Route index element={<p>Tab content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('Nav', () => {
  beforeEach(() => {
    state.isMetaLoading = true;
    state.meta = null;
    localStorage.clear();
  });

  it('shows only a neutral loading screen on a first visit, while the layout and design load', () => {
    renderNav();

    expect(screen.getByRole('status')).toBeTruthy();
    expect(document.querySelector('.brand-loading-logo')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText('Tab content')).toBeNull();
  });

  it('shows the loading screen in the brand the last visit saved', () => {
    localStorage.setItem(
      'myaccount.brand.app-1',
      JSON.stringify({
        background: '#f5f0fa',
        dark: false,
        logoUrl: 'https://x.test/logo.svg',
        name: 'My BT',
        primary: '#5514b4',
      }),
    );
    renderNav();

    const loading: HTMLElement = screen.getByRole('status');
    expect(loading.style.getPropertyValue('--brand-loading-accent')).toBe('#5514b4');
    expect(loading.style.getPropertyValue('--brand-loading-bg')).toBe('#f5f0fa');
    expect(loading.querySelector('img')?.getAttribute('src')).toBe('https://x.test/logo.svg');
    expect(document.title).toBe('My BT');
  });

  it('saves the brand the metadata brings, for the next visit', () => {
    state.isMetaLoading = false;
    state.meta = {
      application: {logoUrl: 'https://x.test/logo.svg', name: 'My BT'},
      design: {theme: {colorSchemes: {light: {palette: {primary: {main: '#5514b4'}}}}}},
    };
    renderNav();

    expect(JSON.parse(localStorage.getItem('myaccount.brand.app-1') ?? '{}')).toEqual({
      dark: false,
      logoUrl: 'https://x.test/logo.svg',
      name: 'My BT',
      primary: '#5514b4',
    });
  });

  it('draws the application once its metadata arrives', () => {
    state.isMetaLoading = false;
    state.meta = {application: {name: 'My BT'}};
    renderNav();

    expect(screen.getByRole('heading', {name: 'My BT'})).toBeTruthy();
    expect(screen.getByText('Tab content')).toBeTruthy();
  });

  it('falls back to the defaults when the metadata cannot load', () => {
    state.isMetaLoading = false;
    renderNav();

    expect(screen.getByRole('heading', {name: 'My Account'})).toBeTruthy();
    expect(screen.getByText('Tab content')).toBeTruthy();
  });
});
