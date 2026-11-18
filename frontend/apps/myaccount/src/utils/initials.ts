// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/** Up to two initials of a name, for an application with no logo. */
const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('');

export default initials;
