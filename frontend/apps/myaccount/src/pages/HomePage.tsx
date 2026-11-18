// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SignedIn, SignedOut, SignInButton, Typography, useThunderID} from '@thunderid/react';
import type {ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import {Navigate} from 'react-router';
import AppLogo from '../components/AppLogo';

export default function HomePage(): ReactElement {
  const {t} = useTranslation();
  const {meta} = useThunderID();
  const appName: string = meta?.application?.name ?? t('app.title', 'My Account');

  return (
    <>
      <SignedOut>
        <div className="hero">
          <div className="hero-inner">
            <div className="hero-mark">
              <AppLogo className="brand-logo brand-logo--hero" name={appName} url={meta?.application?.logoUrl} />
            </div>

            <div className="hero-badge">
              <span className="hero-badge-line" />
              <span>{t('landing.badge', 'Account')}</span>
              <span className="hero-badge-line" />
            </div>

            <Typography variant="h1" fontWeight="bold" align="center" className="hero-title">
              {t('landing.title', 'Your account, your way')}
            </Typography>

            <Typography variant="body1" color="textSecondary" align="center" className="hero-subtitle">
              {t(
                'landing.subtitle',
                'Update your profile, change your password, and review where you are signed in, all in one place.',
              )}
            </Typography>

            <div className="hero-ctas">
              <SignInButton />
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <Navigate to="/account" replace />
      </SignedIn>
    </>
  );
}
