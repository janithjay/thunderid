// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useTheme} from '@thunderid/react';
import {useEffect, type ReactElement, type ReactNode} from 'react';
import {Link} from 'react-router';
import AppLogo from './AppLogo';
import ThemeToggle from './ThemeToggle';
import useBrandTheme, {type Brand} from '../hooks/useBrandTheme';

interface AppShellProps extends Brand {
  /** The account controls at the end of the bar, after the color scheme toggle. */
  actions: ReactNode;
  children: ReactNode;
}

/**
 * The page frame of My Account: the bar with the application's logo and name, the color scheme toggle and
 * the account controls, above the page. My Account renders it for the signed-in user, and the Console's
 * preview with a sample one, so the two look the same.
 */
export default function AppShell({
  actions,
  children,
  designTheme = undefined,
  logoUrl = undefined,
  name,
}: AppShellProps): ReactElement {
  const {colorScheme, toggleTheme} = useTheme();
  const dark: boolean = colorScheme === 'dark';

  useBrandTheme({designTheme, logoUrl, name});

  // On the root element only, so the brand colors set there (see useBrandTheme) are not shadowed by
  // the dark palette redeclared on a descendant.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  }, [dark]);

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <AppLogo className="brand-logo brand-logo--nav" name={name} url={logoUrl} />
          <span className="wordmark-name">{name}</span>
        </Link>
        <div className="nav-actions">
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
          {actions}
        </div>
      </nav>

      {children}
    </div>
  );
}
