// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Base stylesheet configuration.
 */
export interface BaseStylesheet {
  /** Unique identifier for the stylesheet (used as element id in DOM) */
  id: string;
  /** The type of stylesheet */
  type: StylesheetType;
  /** When true the stylesheet is skipped during injection (preview-only toggle). */
  disabled?: boolean;
}

/**
 * Inline stylesheet that injects a `<style>` element.
 */
export interface InlineStylesheet extends BaseStylesheet {
  type: 'inline';
  /** The CSS content to inject */
  content: string;
}

/**
 * URL-based stylesheet that injects a `<link rel="stylesheet">` element.
 */
export interface UrlStylesheet extends BaseStylesheet {
  type: 'url';
  /** The URL of the external stylesheet (must be https) */
  href: string;
}

/**
 * Supported stylesheet types for head injection.
 */
export type StylesheetType = 'inline' | 'url';

/**
 * Union type for all supported stylesheet configurations.
 */
export type Stylesheet = InlineStylesheet | UrlStylesheet;

/**
 * Head configuration within layout, similar to an HTML document head.
 */
export interface LayoutHead {
  /** Stylesheets to inject into the document head */
  stylesheets?: Stylesheet[];
}

/**
 * The side of the sign-in form the side panel sits on. On small screens it sits above the form for
 * `left` and below it for `right`.
 */
export type SidePanelPosition = 'left' | 'right';

/** The kinds of block a side panel is built from. */
export type SidePanelBlockType = 'label' | 'heading' | 'text' | 'image' | 'button' | 'appStore' | 'googlePlay';

/**
 * One block of the side panel. What it uses depends on its type:
 * - `label`, `heading`: `text`.
 * - `text`: `text`, and optionally a link at its end, `linkText` opening `url`.
 * - `image`: `url` (https, or a path on the server) and `text`, which describes it for screen readers.
 * - `button`: `text`, opening `url`.
 * - `appStore`, `googlePlay`: `url`, the application's page in that store.
 */
export interface SidePanelBlock {
  /** Unique within the panel. */
  id: string;
  type: SidePanelBlockType;
  text?: string;
  linkText?: string;
  url?: string;
}

/**
 * A panel beside the sign-in form, built from blocks shown in order. Its colors and font come from the theme.
 */
export interface LayoutSidePanel {
  /** Whether the sign-in page shows the panel. */
  enabled?: boolean;
  /** The side of the form the panel sits on. Defaults to `left`. */
  position?: SidePanelPosition;
  /** Whether small screens show the panel too. Defaults to false, so phones show only the form. */
  showOnSmallScreens?: boolean;
  /** The blocks, in the order the panel shows them. */
  blocks?: SidePanelBlock[];
}

/**
 * Layout configuration as a flexible JSON structure.
 * Contains head configuration, screen definitions, and additional layout properties.
 */
export interface LayoutConfig {
  /**
   * Head configuration for injecting stylesheets into the document head
   */
  head?: LayoutHead;

  /**
   * Screen configurations for different authentication flows
   */
  screens?: Record<string, unknown>;

  /**
   * A panel beside the sign-in form
   */
  sidePanel?: LayoutSidePanel;

  /**
   * Additional layout properties
   */
  [key: string]: unknown;
}
