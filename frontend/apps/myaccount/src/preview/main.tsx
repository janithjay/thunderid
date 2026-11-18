// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// The entry of My Account's preview, which the Console's My Account editor loads into a frame of its own page.
// It loads My Account's own styles, so the preview looks as the app does.
import '../i18n/i18n';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import MyAccountPreview from './MyAccountPreview';
import '../index.css';
import '../App.css';
import './preview.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MyAccountPreview />
  </StrictMode>,
);
