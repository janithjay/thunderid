// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveLogoUri, useTheme, useThunderID} from '@thunderid/react';
import {useEffect} from 'react';
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

/**
 * Brands what the SDK's theme does not reach, from the application's settings in the Console only, so
 * a rebranded My Account never shows another brand. The SDK writes the application's theme to the page
 * root as CSS variables, which `App.css` reads, except a page background: this sets `--brand-bg` from
 * the theme's background for the current color scheme. It titles the tab with the application's name,
 * and uses the application's logo as the favicon, or its initials on the theme's primary color.
 */
export default function useBrandTheme(fallbackTitle: string): void {
  const {meta} = useThunderID();
  const {colorScheme} = useTheme();
  const application = meta?.application;
  const palette = meta?.design?.theme?.colorSchemes?.[colorScheme]?.palette;
  const background: string | undefined = palette?.background?.default;
  const primary: string | undefined = palette?.primary?.main;
  const name: string = application?.name ?? fallbackTitle;

  useEffect(() => {
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
    const logo: ReturnType<typeof resolveLogoUri> | undefined = application?.logoUrl
      ? resolveLogoUri(application.logoUrl, name)
      : undefined;
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
  }, [application?.logoUrl, name, primary]);
}
