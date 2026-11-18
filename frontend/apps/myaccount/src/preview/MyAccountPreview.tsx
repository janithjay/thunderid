// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import enUS from '@thunderid/i18n/locales/en-US';
import {I18nProvider, ThemeProvider, ThunderIDContext, UserDropdown} from '@thunderid/react';
import {useCallback, useContext, useEffect, useMemo, useState, type ComponentProps, type ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import {MemoryRouter} from 'react-router';
import PreviewAddSpace from './PreviewAddSpace';
import PreviewOverlay, {type PreviewDrop} from './PreviewOverlay';
import PreviewSectionView from './PreviewSectionView';
import {
  PREVIEW_MESSAGE_SOURCE,
  type PreviewAnchor,
  type PreviewChange,
  type PreviewMessage,
  type PreviewSelection,
  type PreviewState,
} from './protocol';
import {SAMPLE_ACTIVITY, SAMPLE_ORGANIZATION_UNIT, SAMPLE_USER} from './sampleData';
import {AccountHomeView, type HomeTarget} from '../components/AccountHome';
import AccountView from '../components/AccountView';
import AppShell from '../components/AppShell';
import PreviewContext from '../components/previewContext';
import type {BrandDesignTheme} from '../hooks/useBrandTheme';
import i18n, {NAMESPACE} from '../i18n/i18n';
import {resolveTabs, type AccountSection, type AccountTab} from '../layout/accountLayout';

type ThunderIDContextValue = NonNullable<ComponentProps<typeof ThunderIDContext.Provider>['value']>;
type DesignTheme = ComponentProps<typeof ThemeProvider>['designTheme'];

// The language My Account's own strings are in.
const BUILT_IN_LANGUAGE = 'en-US';

const post = (message: {type: 'ready'} | {selection: PreviewSelection; type: 'select'} | PreviewChange): void => {
  window.parent.postMessage({...message, source: PREVIEW_MESSAGE_SOURCE}, window.location.origin);
};

const isPreviewMessage = (event: MessageEvent): event is MessageEvent<PreviewMessage> =>
  event.source === window.parent &&
  event.origin === window.location.origin &&
  (event.data as {source?: unknown} | null)?.source === PREVIEW_MESSAGE_SOURCE;

// Puts the text being edited over My Account's own strings for its language, replacing what an earlier
// update put there, so a cleared field shows My Account's own text again.
const applyText = (language: string, text: Record<string, string>): void => {
  const own: Record<string, string> = language === BUILT_IN_LANGUAGE ? (enUS[NAMESPACE] as Record<string, string>) : {};
  i18n.removeResourceBundle(language, NAMESPACE);
  i18n.addResourceBundle(language, NAMESPACE, {...own, ...text}, true, true);
  if (i18n.language !== language) {
    i18n.changeLanguage(language).catch(() => undefined);
  }
};

/**
 * My Account as the Console's editor shows it: the same shell, tabs, Home cards and SDK components the
 * app renders, laid out as the editor's draft says and filled with a sample user's data. It runs in a frame
 * of the Console's own page, so My Account's styles and the SDK's apply to the frame alone.
 */
export default function MyAccountPreview(): ReactElement | null {
  const [state, setState] = useState<PreviewState | null>(null);
  const {t} = useTranslation();
  // The SDK's context without a provider: its defaults, which the preview fills with a signed-in sample user.
  const defaults: ThunderIDContextValue | null = useContext(ThunderIDContext);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (!isPreviewMessage(event) || event.data.type !== 'state') return;
      const next: PreviewState = event.data.state;
      applyText(next.language, next.text);
      setState(next);
    };
    window.addEventListener('message', onMessage);
    post({type: 'ready'});
    return (): void => window.removeEventListener('message', onMessage);
  }, []);

  const context: ThunderIDContextValue = useMemo(
    () =>
      ({
        ...defaults,
        currentOrganizationUnit: SAMPLE_ORGANIZATION_UNIT,
        isInitialized: true,
        isLoading: false,
        isSignedIn: true,
        user: SAMPLE_USER,
      }) as ThunderIDContextValue,
    [defaults],
  );

  const select = useCallback((selection: PreviewSelection): void => post({type: 'select', selection}), []);
  const shownTabId: string | undefined = state
    ? resolveTabs(state.tabs, true).find((item) => item.id === state.selection.tabId)?.id
    : undefined;
  const drop = useCallback(
    ({beforeId, id, kind}: PreviewDrop): void => {
      if (kind === 'tab') {
        post({type: 'moveTab', id, beforeId});
      } else if (shownTabId) {
        post({type: 'moveSection', tabId: shownTabId, id, beforeId});
      }
    },
    [shownTabId],
  );

  if (!state) {
    return null;
  }

  // Hidden tabs and components stay in the preview, faded and marked, so they can be picked and shown again.
  const tabs: AccountTab[] = resolveTabs(state.tabs, true);
  const tab: AccountTab = tabs.find((item: AccountTab) => item.id === state.selection.tabId) ?? tabs[0];
  const noop = (): void => undefined;
  const addSpace = state.editable ? (
    <PreviewAddSpace
      accent={state.accent}
      label={state.strings.addComponent}
      onOpen={(anchor: PreviewAnchor) => post({type: 'openAdd', tabId: tab.id, anchor})}
    />
  ) : null;
  const addTabSpace = state.editable ? (
    <PreviewAddSpace
      compact
      accent={state.accent}
      label={state.strings.addTab}
      onOpen={(anchor: PreviewAnchor) => post({type: 'openAddTab', anchor})}
    />
  ) : null;

  return (
    <PreviewContext.Provider value>
      <ThunderIDContext.Provider value={context}>
        <I18nProvider>
          <ThemeProvider designTheme={state.designTheme as DesignTheme} mode={state.colorScheme}>
            <MemoryRouter>
              <AppShell
                name={state.application.name}
                logoUrl={state.application.logoUrl}
                designTheme={state.designTheme as BrandDesignTheme | null}
                actions={<UserDropdown showTriggerLabel manageProfileLabel={t('nav.manageProfile', 'Account')} />}
              >
                <AccountView
                  footer={addSpace}
                  navFooter={addTabSpace}
                  tabs={tabs}
                  tab={tab}
                  onSelectTab={noop}
                  renderHome={(home: AccountTab) => (
                    <AccountHomeView
                      sections={home.sections}
                      canNavigate={(target: HomeTarget) =>
                        tabs.some((item: AccountTab) => item.id === target && !item.hidden)
                      }
                      onNavigate={noop}
                      activity={SAMPLE_ACTIVITY}
                    />
                  )}
                  renderSection={(section: AccountSection) => <PreviewSectionView section={section} />}
                />
              </AppShell>
            </MemoryRouter>
            <PreviewOverlay
              accent={state.accent}
              editable={state.editable}
              hidden={[
                ...tabs.filter((item: AccountTab) => item.hidden).map((item: AccountTab) => `tab:${item.id}`),
                ...tab.sections
                  .filter((section: AccountSection) => section.hidden)
                  .map((section: AccountSection) => `section:${section.id}`),
              ]}
              hiddenLabel={state.strings.hidden}
              onDrop={drop}
              labels={state.labels}
              selection={state.selection}
              tabId={tab.id}
              onSelect={select}
            />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>
    </PreviewContext.Provider>
  );
}
