// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import uniqueLayoutHandle from '../uniqueLayoutHandle';

const layout = (handle: string): {displayName: string; handle: string; id: string; layout: null} => ({
  id: handle,
  handle,
  displayName: handle,
  layout: null,
});

describe('uniqueLayoutHandle', () => {
  it('makes a handle from the name, numbered when one is taken', () => {
    expect(uniqueLayoutHandle('Sign-in with Picture', [])).toBe('sign-in-with-picture');
    expect(uniqueLayoutHandle('Centered', [layout('centered'), layout('centered-2')])).toBe('centered-3');
    expect(uniqueLayoutHandle('  ', [])).toBe('layout');
  });
});
