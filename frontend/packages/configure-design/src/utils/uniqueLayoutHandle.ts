// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {LayoutListItem} from '@thunderid/design';
import {kebabCase} from '@thunderid/utils';

/** A handle made from a name that no layout has yet: the name in kebab case, numbered when it is taken. */
export default function uniqueLayoutHandle(name: string, layouts: LayoutListItem[]): string {
  const taken = new Set<string>(layouts.map((layout: LayoutListItem) => layout.handle));
  const base: string = kebabCase(name.trim()) || 'layout';
  let handle: string = base;
  for (let suffix = 2; taken.has(handle); suffix += 1) {
    handle = `${base}-${suffix}`;
  }
  return handle;
}
