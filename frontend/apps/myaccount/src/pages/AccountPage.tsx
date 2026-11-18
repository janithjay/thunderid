// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useThunderID} from '@thunderid/react';
import type {ReactElement} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router';
import AccountHome, {type HomeTarget} from '../components/AccountHome';
import AccountSectionView from '../components/AccountSectionView';
import AccountView from '../components/AccountView';
import {resolveTabs, type AccountSection, type AccountTab} from '../layout/accountLayout';

/** The My Account configuration the flow metadata carries for the application, when it has one. */
interface MyAccountMeta {
  myAccount?: {tabs?: AccountTab[]};
}

// The tabs, their order and the components in each come from the application's My Account configuration.
export default function AccountPage(): ReactElement {
  const {meta} = useThunderID();
  const tabs: AccountTab[] = resolveTabs((meta as MyAccountMeta | null)?.myAccount?.tabs);
  const {tabId} = useParams();
  const navigate = useNavigate();
  // The URL is the source of truth, so browser back/forward also switch tabs.
  const tab: AccountTab | undefined = tabs.find((item: AccountTab) => item.id === tabId);

  // A tab that is not shown, or no longer exists, opens the first one.
  if (!tab) {
    return <Navigate to={`/${tabs[0].id}`} replace />;
  }

  const selectTab = (id: string): void => {
    void navigate(`/${id}`);
  };

  return (
    <AccountView
      tabs={tabs}
      tab={tab}
      onSelectTab={selectTab}
      renderHome={(home: AccountTab) => (
        <AccountHome
          sections={home.sections}
          canNavigate={(target: HomeTarget) => tabs.some((item: AccountTab) => item.id === target)}
          onNavigate={selectTab}
        />
      )}
      renderSection={(section: AccountSection) => <AccountSectionView section={section} />}
    />
  );
}
