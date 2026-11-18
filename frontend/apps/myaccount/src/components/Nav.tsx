// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Loading, SignedIn, SignedOut, SignInButton, UserDropdown, useTheme, useThunderID} from '@thunderid/react';
import {useEffect, type ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import {Link, Outlet, useNavigate} from 'react-router';
import AppLogo from './AppLogo';
import ThemeToggle from './ThemeToggle';
import useBrandTheme from '../hooks/useBrandTheme';
import useServerTranslations from '../i18n/useServerTranslations';

export default function Nav(): ReactElement {
  const navigate = useNavigate();
  const {t} = useTranslation();
  const {meta} = useThunderID();
  const {colorScheme, toggleTheme} = useTheme();
  const dark: boolean = colorScheme === 'dark';
  const appName: string = meta?.application?.name ?? t('app.title', 'My Account');

  useServerTranslations();
  useBrandTheme(appName);

  // On the root element only, so the brand colors set there (see useBrandTheme) are not shadowed by
  // the dark palette redeclared on a descendant.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  }, [dark]);

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <AppLogo className="brand-logo brand-logo--nav" name={appName} url={meta?.application?.logoUrl} />
          <span className="wordmark-name">{appName}</span>
        </Link>
        <div className="nav-actions">
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
          <SignedIn>
            <UserDropdown
              showTriggerLabel
              manageProfileLabel={t('nav.manageProfile', 'Account')}
              onManageProfile={() => void navigate('/account')}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </nav>

      <Loading>
        <div className="loading-screen">{t('app.loading', 'Loading')}</div>
      </Loading>

      <Outlet />
    </div>
  );
}
