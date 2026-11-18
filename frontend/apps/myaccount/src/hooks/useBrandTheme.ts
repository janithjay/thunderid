// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveLogoUri, useTheme} from '@thunderid/react';
import {useEffect, useLayoutEffect} from 'react';
import initials from '../utils/initials';

// The icon color when the theme names no primary color: a neutral gray, never a product's brand color.
const NEUTRAL_ICON_COLOR = '#5f6368';

const escapeXml = (text: string): string => text.replace(/[<>&'"]/g, (char: string) => `&#${char.charCodeAt(0)};`);

/** A square SVG icon with the given text on a rounded tile, as a data URI. */
const textIcon = (text: string, background?: string): string => {
  const tile: string = background ? `<rect width="64" height="64" rx="14" fill="${escapeXml(background)}"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${tile}<text x="32" y="33" dominant-baseline="central" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${background ? 28 : 48}" font-weight="600" fill="#ffffff">${escapeXml(text)}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** The parts of the application's design theme this reads, per color scheme. */
export interface BrandDesignTheme {
  colorSchemes?: Record<string, {palette?: {background?: {default?: string}; primary?: {main?: string}}}>;
}

/** The application's name, logo and design theme, as the flow metadata carries them. */
export interface Brand {
  designTheme?: BrandDesignTheme | null;
  logoUrl?: string;
  name: string;
}

/**
 * Brands what the SDK's theme does not reach, from the application's settings in the Console only, so
 * a rebranded My Account never shows another brand. The SDK writes the application's theme to the page
 * root as CSS variables, which `App.css` reads, except a page background: this sets `--brand-bg` from
 * the theme's background for the current color scheme. It titles the tab with the application's name,
 * and uses the application's logo as the favicon, or its initials on the theme's primary color.
 */
export default function useBrandTheme({designTheme, logoUrl, name}: Brand): void {
  const {colorScheme} = useTheme();
  const palette = designTheme?.colorSchemes?.[colorScheme]?.palette;
  const background: string | undefined = palette?.background?.default;
  const primary: string | undefined = palette?.primary?.main;

  // Before the browser paints, so the page never shows the default background first.
  useLayoutEffect(() => {
    const {style} = document.documentElement;

    if (background) {
      style.setProperty('--brand-bg', background);
    } else {
      style.removeProperty('--brand-bg');
    }
  }, [background]);

  useEffect(() => {
    document.title = name;
  }, [name]);

  useEffect(() => {
    const logo: ReturnType<typeof resolveLogoUri> | undefined = logoUrl ? resolveLogoUri(logoUrl, name) : undefined;
    let href: string;

    if (logo?.kind === 'emoji' && logo.glyph) {
      href = textIcon(logo.glyph);
    } else if (logo?.imgSrc) {
      href = logo.imgSrc;
    } else {
      href = textIcon(initials(name), primary ?? NEUTRAL_ICON_COLOR);
    }

    const link: HTMLLinkElement | null = document.querySelector('link[rel="icon"]');

    if (link) {
      link.href = href;
    }
  }, [logoUrl, name, primary]);
}
