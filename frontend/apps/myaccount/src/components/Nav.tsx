// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Loading, SignedIn, SignedOut, SignInButton, UserDropdown, useTheme, useThunderID} from '@thunderid/react';
import {useEffect, useState, type ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import {Outlet, useNavigate} from 'react-router';
import AppShell from './AppShell';
import BrandLoading from './BrandLoading';
import {getRuntimeConfig} from '../config/runtimeConfig';
import type {BrandDesignTheme} from '../hooks/useBrandTheme';
import useServerTranslations from '../i18n/useServerTranslations';
import {readBrand, saveBrand, type CachedBrand} from '../utils/brandCache';

export default function Nav(): ReactElement {
  const navigate = useNavigate();
  const {t} = useTranslation();
  const {isMetaLoading, meta} = useThunderID();
  const {colorScheme} = useTheme();
  const applicationId: string | undefined = getRuntimeConfig()?.client.application_id;
  const [savedBrand] = useState<CachedBrand | null>(() => readBrand(applicationId));
  const appName: string = meta?.application?.name ?? t('app.title', 'My Account');
  const designTheme = meta?.design?.theme as BrandDesignTheme | undefined;
  const palette = designTheme?.colorSchemes?.[colorScheme]?.palette;

  useServerTranslations();

  // Saves the brand this load brought, for the loading screen of the next visit.
  useEffect(() => {
    if (!meta?.application?.name) return;
    saveBrand(applicationId, {
      background: palette?.background?.default,
      dark: colorScheme === 'dark',
      logoUrl: meta.application.logoUrl,
      name: meta.application.name,
      primary: palette?.primary?.main,
    });
  }, [applicationId, colorScheme, meta, palette?.background?.default, palette?.primary?.main]);

  // The application's layout and design come with its flow metadata. Until they arrive, show the loading
  // screen, so a refresh never shows the default tabs, a hidden section or the default colors first.
  if (isMetaLoading && !meta) {
    return <BrandLoading brand={savedBrand} />;
  }

  return (
    <AppShell
      name={appName}
      logoUrl={meta?.application?.logoUrl}
      designTheme={designTheme}
      actions={
        <>
          <SignedIn>
            <UserDropdown
              showTriggerLabel
              manageProfileLabel={t('nav.manageProfile', 'Account')}
              onManageProfile={() => void navigate('/')}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </>
      }
    >
      <Loading>
        <div className="loading-screen">{t('app.loading', 'Loading')}</div>
      </Loading>

      <Outlet />
    </AppShell>
  );
}
