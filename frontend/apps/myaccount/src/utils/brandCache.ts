// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The application's brand as My Account last showed it: enough to draw the loading screen in the brand's
 * colors on the next visit, before the flow metadata arrives. It is kept in this browser only, and the
 * flow metadata stays the source: each load saves what it brings.
 */
export interface CachedBrand {
  background?: string;
  dark: boolean;
  logoUrl?: string;
  name: string;
  primary?: string;
}

const key = (applicationId: string | undefined): string => `myaccount.brand.${applicationId ?? 'default'}`;

export const readBrand = (applicationId: string | undefined): CachedBrand | null => {
  try {
    const saved: string | null = localStorage.getItem(key(applicationId));
    return saved ? (JSON.parse(saved) as CachedBrand) : null;
  } catch {
    return null;
  }
};

export const saveBrand = (applicationId: string | undefined, brand: CachedBrand): void => {
  try {
    localStorage.setItem(key(applicationId), JSON.stringify(brand));
  } catch {
    // Storage is full or blocked: the next visit shows the plain loading screen.
  }
};
