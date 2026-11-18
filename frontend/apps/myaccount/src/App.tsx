// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ProtectedRoute} from '@thunderid/react-router';
import type {ReactElement} from 'react';
import {createBrowserRouter, RouterProvider} from 'react-router';
import Nav from './components/Nav';
import {getAppBase} from './config/runtimeConfig';
import AccountPage from './pages/AccountPage';
import HomePage from './pages/HomePage';
import './App.css';

const router = createBrowserRouter(
  [
    {
      element: <Nav />,
      children: [
        {
          // There is no page for visitors who are not signed in: they go straight to sign-in.
          path: '/',
          element: (
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          ),
        },
        {
          // Each tab of My Account has its own address under the app's path: /home, /personal, /security.
          path: '/:tabId',
          element: (
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          ),
        },
      ],
    },
  ],
  {basename: getAppBase()},
);

export default function App(): ReactElement {
  return <RouterProvider router={router} />;
}
