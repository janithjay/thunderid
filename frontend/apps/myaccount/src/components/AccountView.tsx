// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Button, Typography} from '@thunderid/react';
import type {ReactElement, ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import TabIcon from './icons/TabIcon';
import PreviewRegion from './PreviewRegion';
import {isBuiltInTab, type AccountSection, type AccountTab} from '../layout/accountLayout';

// The English fallbacks of the built-in tabs' text.
const TAB_LABELS: Record<string, string> = {
  home: 'Home',
  personal: 'Personal info',
  security: 'Security',
  devices: 'Devices',
};
const TAB_TITLES: Record<string, string> = {
  personal: 'Personal info',
  security: 'Security',
  devices: 'Your devices',
};
const TAB_SUBTITLES: Record<string, string> = {
  personal: 'Manage the basic profile info others may see.',
  security: 'Manage your password, passkeys and other credentials.',
  devices: "Where you're signed in, and the apps you used there. Sign out of any device you don't recognize.",
};

interface AccountViewProps {
  /** Shown at the end of the tab's content: the Console's preview puts its add space here. */
  footer?: ReactNode;
  /** Shown under the menu: the Console's preview puts its button to add a menu item here. */
  navFooter?: ReactNode;
  onSelectTab: (id: string) => void;
  /** The content of the Home tab. */
  renderHome: (tab: AccountTab) => ReactNode;
  /** One component of a tab other than Home. */
  renderSection: (section: AccountSection) => ReactNode;
  /** The tab shown. */
  tab: AccountTab;
  /** The tabs in the menu, in order. */
  tabs: AccountTab[];
}

// The title and introduction of a tab's content.
function ContentHeading({subtitle, title}: {subtitle: string; title: string}): ReactElement {
  return (
    <div className="account-content-heading">
      <Typography variant="h4" component="h2" fontWeight="semibold">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </div>
  );
}

/**
 * The account page as the user sees it, Google Account-style: a persistent left nav switching between tabs
 * of content on the right. My Account renders it with the user's data, and the Console's preview with sample
 * data, so the two always look the same.
 */
export default function AccountView({
  footer = null,
  navFooter = null,
  onSelectTab,
  renderHome,
  renderSection,
  tab,
  tabs,
}: AccountViewProps): ReactElement {
  const {t} = useTranslation();
  const label = (item: AccountTab): string => t(`tabs.${item.id}`, TAB_LABELS[item.id] ?? item.id);

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <nav className="account-nav" aria-label={t('account.sections', 'Account sections')}>
          {tabs.map((item: AccountTab) => (
            <PreviewRegion key={item.id} kind="tab" id={item.id} hidden={item.hidden}>
              <Button
                variant="text"
                color={tab.id === item.id ? 'primary' : 'tertiary'}
                fullWidth
                startIcon={<TabIcon tab={item} />}
                className={`account-nav-item${tab.id === item.id ? ' account-nav-item--active' : ''}`}
                aria-current={tab.id === item.id ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
              >
                {label(item)}
              </Button>
            </PreviewRegion>
          ))}
        </nav>
        {navFooter}
      </aside>

      <main className="account-content">
        <div className="account-content-inner">
          {/* A hidden tab is only rendered in the Console's preview, which dims its whole page. */}
          <div className={tab.hidden ? 'preview-page--hidden' : undefined}>
            {tab.id === 'home' && !tab.custom ? (
              renderHome(tab)
            ) : (
              <>
                <ContentHeading
                  title={
                    isBuiltInTab(tab.id) && !tab.custom
                      ? t(`${tab.id}.title`, TAB_TITLES[tab.id] ?? label(tab))
                      : label(tab)
                  }
                  subtitle={t(`${tab.id}.subtitle`, TAB_SUBTITLES[tab.id] ?? '')}
                />
                <div className="account-section-list">
                  {tab.sections.map((section: AccountSection) => (
                    <PreviewRegion key={section.id} kind="section" id={section.id} hidden={section.hidden}>
                      {renderSection(section)}
                    </PreviewRegion>
                  ))}
                </div>
              </>
            )}
          </div>
          {footer}
        </div>
      </main>
    </div>
  );
}
