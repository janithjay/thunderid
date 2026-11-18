// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Blocks,
  Fingerprint,
  IdCard,
  KeyRound,
  Laptop,
  LayoutGrid,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
} from '@wso2/oxygen-ui-icons-react';
import type {JSX} from 'react';
import type {MyAccountSectionType} from '../models/my-account';

const ICONS: Record<MyAccountSectionType, typeof Blocks> = {
  'home.personalInfo': IdCard,
  'home.securityCheckup': ShieldCheck,
  'home.devices': Laptop,
  'home.apps': LayoutGrid,
  profile: UserRound,
  credential: KeyRound,
  passkeys: Fingerprint,
  sessions: MonitorSmartphone,
  widget: Blocks,
};

/** The icon of a kind of component, as the menu item tree shows it. */
export default function SectionIcon({type}: {type: MyAccountSectionType}): JSX.Element {
  const Icon = ICONS[type];
  return <Icon size={16} aria-hidden />;
}
