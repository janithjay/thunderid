// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Box} from '@wso2/oxygen-ui';
import {
  Bell,
  CircleHelp,
  Home,
  Info,
  Link,
  MonitorSmartphone,
  Settings,
  Shield,
  Star,
  UserRound,
} from '@wso2/oxygen-ui-icons-react';
import type {JSX} from 'react';
import type {MyAccountTab} from '../models/my-account';

// Each icon by the ID of a built-in tab, or the icon name of a custom one.
const ICONS: Record<string, typeof Info> = {
  home: Home,
  personal: UserRound,
  security: Shield,
  devices: MonitorSmartphone,
  info: Info,
  help: CircleHelp,
  link: Link,
  star: Star,
  settings: Settings,
  bell: Bell,
};

/**
 * The icon My Account shows for a tab: its image, the named icon it was given, else its built-in icon.
 */
export default function TabIcon({tab}: {tab: MyAccountTab}): JSX.Element {
  if (tab.iconUrl) {
    return <Box component="img" src={tab.iconUrl} alt="" sx={{width: 16, height: 16, objectFit: 'contain'}} />;
  }
  const Icon: typeof Info = ICONS[tab.icon ?? (tab.custom ? 'info' : tab.id)] ?? Info;
  return <Icon size={16} aria-hidden />;
}
