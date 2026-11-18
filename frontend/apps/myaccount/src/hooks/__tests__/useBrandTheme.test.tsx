// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import useBrandTheme, {type Brand, type BrandDesignTheme} from '../useBrandTheme';

const state: {colorScheme: 'light' | 'dark'; meta: unknown} = {colorScheme: 'light', meta: null};

vi.mock('@thunderid/react', () => ({
  resolveLogoUri: (url: string) =>
    url.startsWith('emoji:')
      ? {glyph: url.slice('emoji:'.length), kind: 'emoji'}
      : {imgSrc: url.startsWith('https://') ? url : undefined, kind: 'image'},
  useTheme: () => ({colorScheme: state.colorScheme}),
}));

interface Meta {
  application?: {logoUrl?: string; name?: string};
  design?: {theme?: BrandDesignTheme};
}

// The brand as My Account reads it from the flow metadata, with its own name until the application loads.
const brand = (): Brand => {
  const meta = state.meta as Meta | null;
  return {
    designTheme: meta?.design?.theme,
    logoUrl: meta?.application?.logoUrl,
    name: meta?.application?.name ?? 'My Account',
  };
};

const metaWith = (light: object, dark: object = {}, application?: object): unknown => ({
  application,
  design: {layout: {}, theme: {colorSchemes: {dark: {palette: dark}, light: {palette: light}}}},
});

const background = (): string => document.documentElement.style.getPropertyValue('--brand-bg');
const favicon = (): string | null | undefined => document.querySelector('link[rel="icon"]')?.getAttribute('href');
const faviconSvg = (): string => decodeURIComponent(favicon()?.replace('data:image/svg+xml,', '') ?? '');

describe('useBrandTheme', () => {
  beforeEach(() => {
    state.colorScheme = 'light';
    state.meta = null;
    document.documentElement.removeAttribute('style');
    document.head.innerHTML = '<link rel="icon" href="data:," />';
  });

  it("sets the page background from the theme's current color scheme and follows a switch", () => {
    state.meta = metaWith({background: {default: '#f0f0f0'}}, {background: {default: '#101010'}});

    const {rerender} = renderHook(() => useBrandTheme(brand()));
    expect(background()).toBe('#f0f0f0');

    state.colorScheme = 'dark';
    rerender();
    expect(background()).toBe('#101010');
  });

  it('leaves the page background to the defaults when the theme sets none', () => {
    state.meta = metaWith({background: {default: '#f0f0f0'}});
    const {rerender} = renderHook(() => useBrandTheme(brand()));

    state.meta = metaWith({primary: {main: '#7c3aed'}});
    rerender();

    expect(background()).toBe('');
  });

  it('titles the tab with the application name, or the fallback without one', () => {
    const {rerender} = renderHook(() => useBrandTheme(brand()));
    expect(document.title).toBe('My Account');

    state.meta = metaWith({}, {}, {id: 'app', name: 'Acme Account'});
    rerender();
    expect(document.title).toBe('Acme Account');
  });

  it("uses the application's logo as the favicon", () => {
    state.meta = metaWith({}, {}, {id: 'app', logoUrl: 'https://cdn.example.com/logo.png', name: 'Acme'});

    renderHook(() => useBrandTheme(brand()));

    expect(favicon()).toBe('https://cdn.example.com/logo.png');
  });

  it('draws an emoji logo as the favicon', () => {
    state.meta = metaWith({}, {}, {id: 'app', logoUrl: 'emoji:🔑', name: 'Acme'});

    renderHook(() => useBrandTheme(brand()));

    expect(faviconSvg()).toContain('🔑');
  });

  it("draws the application's initials on the theme's primary color when it has no logo", () => {
    state.meta = metaWith({primary: {main: '#7c3aed'}}, {primary: {main: '#a78bfa'}}, {id: 'app', name: 'Acme Corp'});

    const {rerender} = renderHook(() => useBrandTheme(brand()));
    expect(faviconSvg()).toContain('>AC<');
    expect(faviconSvg()).toContain('#7c3aed');

    state.colorScheme = 'dark';
    rerender();
    expect(faviconSvg()).toContain('#a78bfa');
  });

  it('never falls back to a product icon: before the application loads, it draws the fallback initials in gray', () => {
    renderHook(() => useBrandTheme(brand()));

    expect(faviconSvg()).toContain('>MA<');
    expect(faviconSvg()).toContain('#5f6368');
  });
});
