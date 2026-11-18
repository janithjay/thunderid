// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cn} from '@thunderid/utils';
import {CircularProgress, Stack} from '@wso2/oxygen-ui';
import type {JSX, PropsWithChildren} from 'react';

export interface AuthPageLayoutProps extends PropsWithChildren {
  /** Class name prefix for product name prefixed CSS (e.g. 'SignIn' → '<PRODUCT_NAME>SignIn--root'). */
  variant?: string;
  /** Optional background CSS value (color, gradient, image). Falls back to the theme's background.default. */
  background?: string;
  /** Whether to show the loading state (e.g. skeletons instead of content). */
  isLoading: boolean;
  /**
   * Centers the page's columns vertically against each other on wide screens, such as a side panel and the
   * sign-in form, instead of lining up their tops.
   */
  centerColumns?: boolean;
}

/**
 * Shared page-level layout for authentication screens (sign-in, sign-up, accept-invite).
 *
 * Provides the full-page centering structure used by the Gate app. Both the Gate and
 * Console preview render this component so they are visually identical.
 */
export default function AuthPageLayout({
  isLoading,
  variant = undefined,
  background = undefined,
  centerColumns = false,
  children,
}: AuthPageLayoutProps): JSX.Element {
  return (
    <Stack
      direction="column"
      component="main"
      className={variant ? cn(`${variant}--root`) : undefined}
      sx={[
        {
          justifyContent: 'safe center',
          height: 'calc((1 - var(--template-frame-height, 0)) * 100%)',
          minHeight: '100%',
          ...(background ? {backgroundColor: background} : {}),
        },
      ]}
    >
      <Stack
        direction={{xs: 'row-reverse', md: 'row'}}
        sx={{
          justifyContent: 'center',
          gap: {xs: 6, sm: 12},
          p: 2,
          mx: 'auto',
        }}
      >
        <Stack
          direction={{xs: 'column', md: 'row'}}
          sx={{
            justifyContent: 'center',
            ...(centerColumns ? {alignItems: {md: 'center'}} : {}),
            gap: {xs: 4, sm: 16},
            p: {xs: 2, sm: 4},
            m: 'auto',
          }}
        >
          {isLoading ? <CircularProgress /> : children}
        </Stack>
      </Stack>
    </Stack>
  );
}
