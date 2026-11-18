// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ActiveSessions, Button, ChangeCredential, Passkeys, Typography, UserIcon, UserProfile} from '@thunderid/react';
import {type ComponentType, type ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import {useSearchParams} from 'react-router';
import AccountHome from '../components/AccountHome';

function HomeIcon(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

// SDK icon, sized to match the other 20px icons.
function PersonIcon(): ReactElement {
  return <UserIcon width={20} height={20} strokeWidth={1.75} aria-hidden="true" />;
}

function ShieldIcon(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function DevicesIcon(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="14" height="10" rx="1.5" />
      <path d="M1 17h16" />
      <rect x="17" y="8" width="6" height="12" rx="1.5" />
    </svg>
  );
}

type Tab = 'home' | 'personal' | 'security' | 'devices';

interface TabItem {
  id: Tab;
  icon: ComponentType;
  // The tab's translation key and its English fallback.
  label: [string, string];
}

const TABS: TabItem[] = [
  {id: 'home', label: ['tabs.home', 'Home'], icon: HomeIcon},
  {id: 'personal', label: ['tabs.personal', 'Personal info'], icon: PersonIcon},
  {id: 'security', label: ['tabs.security', 'Security'], icon: ShieldIcon},
  {id: 'devices', label: ['tabs.devices', 'Devices'], icon: DevicesIcon},
];

// The title and introduction of a tab's content.
function ContentHeading({subtitle, title}: {subtitle: string; title: string}): ReactElement {
  return (
    <div className="account-content-heading">
      <Typography variant="h4" component="h2" fontWeight="semibold">
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {subtitle}
      </Typography>
    </div>
  );
}

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

// Google Account-style layout: a persistent left nav switching between tabs of
// content on the right, rather than a single scrolling page or a modal.
export default function AccountPage(): ReactElement {
  const {t} = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL is the source of truth, so browser back/forward also switch tabs.
  const requestedTab: string | null = searchParams.get('tab');
  const tab: Tab = isTab(requestedTab) ? requestedTab : 'home';

  const selectTab = (id: Tab): void => {
    setSearchParams(id === 'home' ? {} : {tab: id});
  };

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <nav className="account-nav" aria-label={t('account.sections', 'Account sections')}>
          {TABS.map(({id, label: [labelKey, labelFallback], icon: Icon}) => (
            <Button
              key={id}
              variant="text"
              color={tab === id ? 'primary' : 'tertiary'}
              fullWidth
              startIcon={<Icon />}
              className={`account-nav-item${tab === id ? ' account-nav-item--active' : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => selectTab(id)}
            >
              {t(labelKey, labelFallback)}
            </Button>
          ))}
        </nav>
      </aside>

      <main className="account-content">
        <div className="account-content-inner">
          {tab === 'home' && <AccountHome onNavigate={selectTab} />}

          {tab === 'personal' && (
            <>
              <ContentHeading
                title={t('personal.title', 'Personal info')}
                subtitle={t('personal.subtitle', 'Manage the basic profile info others may see.')}
              />
              <UserProfile />
            </>
          )}

          {tab === 'security' && (
            <>
              <ContentHeading
                title={t('security.title', 'Security')}
                subtitle={t('security.subtitle', 'Manage your password, passkeys and other credentials.')}
              />
              <div className="account-security-list">
                <ChangeCredential />
                <Passkeys />
              </div>
            </>
          )}

          {tab === 'devices' && (
            <>
              <ContentHeading
                title={t('devices.title', 'Your devices')}
                subtitle={t(
                  'devices.subtitle',
                  "Where you're signed in, and the apps you used there. Sign out of any device you don't recognize.",
                )}
              />
              <ActiveSessions />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
