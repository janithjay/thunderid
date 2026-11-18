// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useGetTheme, type Theme} from '@thunderid/design';

/**
 * The theme of the design assigned to an application, which My Account renders in. The result is undefined
 * when the application has no theme, and null while it loads.
 *
 * @param themeId - The ID of the application's theme, if it has one
 * @returns The application's theme
 * @public
 */
export default function useGetApplicationTheme(themeId: string | undefined): Theme | null | undefined {
  const theme = useGetTheme(themeId ?? '');

  if (themeId && theme.isLoading) {
    return null;
  }
  return theme.data?.theme;
}
