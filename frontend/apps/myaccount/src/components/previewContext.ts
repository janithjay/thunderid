// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {createContext} from 'react';

/** Whether My Account renders in the Console's preview, where its tabs and components can be picked. */
const PreviewContext = createContext<boolean>(false);

export default PreviewContext;
