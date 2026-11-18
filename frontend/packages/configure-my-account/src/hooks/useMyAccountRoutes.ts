// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Route paths of the My Account page, which the host composes into its route configuration.
 *
 * @public
 */
export interface MyAccountRoutePaths {
  myAccount: {
    list: () => string;
  };
}

/**
 * Default My Account paths, matching the console's.
 *
 * @public
 */
export const defaultMyAccountRoutePaths: MyAccountRoutePaths = {
  myAccount: {
    list: () => '/my-account',
  },
};
