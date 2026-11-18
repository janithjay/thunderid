// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useThunderID} from '@thunderid/react';
import type {ReactElement} from 'react';
import {Navigate} from 'react-router';
import {resolveTabs, type AccountTab} from '../layout/accountLayout';

/** My Account opens on its first tab, such as /home. A visitor who is not signed in goes to sign-in first. */
export default function HomePage(): ReactElement {
  const {meta} = useThunderID();
  const firstTab: string = resolveTabs((meta as {myAccount?: {tabs?: AccountTab[]}} | null)?.myAccount?.tabs)[0].id;

  return <Navigate to={`/${firstTab}`} replace />;
}
