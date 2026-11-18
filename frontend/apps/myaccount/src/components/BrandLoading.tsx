// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useEffect, type CSSProperties, type ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import AppLogo from './AppLogo';
import type {CachedBrand} from '../utils/brandCache';

/**
 * The screen My Account shows while the application's layout and design load: the logo on the brand's
 * background, with a spinner in its primary color, as the last visit saved them. On a first visit there is
 * nothing saved, so it shows only a neutral spinner and never another brand's colors.
 */
export default function BrandLoading({brand}: {brand: CachedBrand | null}): ReactElement {
  const {t} = useTranslation();

  useEffect(() => {
    if (brand?.name) document.title = brand.name;
  }, [brand?.name]);

  const style = {
    '--brand-loading-bg': brand?.background,
    '--brand-loading-accent': brand?.primary,
  } as CSSProperties;

  return (
    <div
      className={brand?.dark ? 'brand-loading brand-loading--dark' : 'brand-loading'}
      style={style}
      role="status"
      aria-label={t('app.loading', 'Loading')}
    >
      {brand && <AppLogo className="brand-loading-logo" name={brand.name} url={brand.logoUrl} />}
      <span className="brand-loading-spinner" />
    </div>
  );
}
