// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';
import '../i18n/i18n';

afterEach(() => {
  cleanup();
});
