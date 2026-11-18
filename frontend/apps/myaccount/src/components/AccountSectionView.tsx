// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ActiveSessions, ChangeCredential, Passkeys, UserProfile} from '@thunderid/react';
import type {ReactElement} from 'react';
import CustomWidget from './CustomWidget';
import type {AccountSection} from '../layout/accountLayout';

/**
 * One section of a tab: an SDK component, used as it is, or a widget. A Home card renders only on the
 * Home tab, so it renders nothing here.
 */
export default function AccountSectionView({section}: {section: AccountSection}): ReactElement | null {
  switch (section.type) {
    case 'profile':
      return <UserProfile />;
    case 'credential':
      return <ChangeCredential attribute={section.attribute} />;
    case 'passkeys':
      return <Passkeys />;
    case 'sessions':
      return <ActiveSessions />;
    case 'widget':
      return <CustomWidget section={section} />;
    default:
      return null;
  }
}
