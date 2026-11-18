// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GatePreview} from '@thunderid/configure-design';
import type {Theme} from '@thunderid/design';
import {Menu, MenuItem, Popover, Typography, useTheme} from '@wso2/oxygen-ui';
import {useCallback, useEffect, useMemo, useRef, useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import AddTabForm from './AddTabForm';
import {MAX_SECTIONS_PER_TAB, MAX_TABS, type SectionCatalogEntry} from '../constants/catalog';
import type {MyAccountSectionType, MyAccountTab, MyAccountText} from '../models/my-account';
import {tabLabel} from '../utils/labels';
import {allowedSections, removedBuiltInTabs, type TabIconChoice} from '../utils/layoutEditing';
import {
  buildPreviewState,
  PREVIEW_MESSAGE_SOURCE,
  type PreviewAnchor,
  type PreviewMessage,
  type PreviewSelection,
  type PreviewState,
} from '../utils/previewState';

/**
 * What the preview asks the editor to change: add a component picked from the menu its add space opens, or move a
 * tab or a component.
 */
export type PreviewChange =
  | {component: MyAccountSectionType; tabId: string; type: 'add'}
  | Extract<PreviewMessage, {type: 'moveTab'} | {type: 'moveSection'}>;

/** The menu of components the add space opened: the tab they go in, and where on the page it opens. */
interface AddMenu {
  position: {left: number; top: number};
  tabId: string;
}

// Where a point of the frame's viewport is on the page: the frame is scaled from its top left corner to fit the
// canvas and the zoom, so the point is scaled the same way from the frame's corner.
const pagePosition = (frame: Window, anchor: PreviewAnchor): AddMenu['position'] | undefined => {
  const element: HTMLIFrameElement | undefined = Array.from(document.querySelectorAll('iframe')).find(
    (candidate: HTMLIFrameElement) => candidate.contentWindow === frame,
  );
  if (!element) return undefined;
  const box: DOMRect = element.getBoundingClientRect();
  const scale: number = element.offsetWidth > 0 ? box.width / element.offsetWidth : 1;
  return {left: box.left + (anchor.left + anchor.width) * scale, top: box.top + (anchor.top + anchor.height) * scale};
};

interface MyAccountPreviewProps {
  application: {logoUrl?: string; name: string};
  /** Whether the layout can be changed, so the preview offers dragging and adding. */
  editable: boolean;
  language: string;
  /** Adds a menu item, named in the form the button under the preview's menu opens. */
  onAddTab: (name: string, icon: TabIconChoice) => void;
  /** Brings back a built-in menu item that was deleted, from the same form. */
  onRestoreTab: (tabId: string) => void;
  onChange: (change: PreviewChange) => void;
  onSelect: (selection: PreviewSelection) => void;
  /** The address of My Account's preview page, which the Console serves. */
  pageUrl: string;
  selection: PreviewSelection;
  tabs: MyAccountTab[];
  text: MyAccountText;
  /** The application's design theme: null while it loads, undefined when it has none. */
  theme: Theme | null | undefined;
  toolbarPortal: HTMLElement | null;
}

const isPreviewMessage = (event: MessageEvent, frame: Window | null): event is MessageEvent<PreviewMessage> =>
  frame !== null &&
  event.source === frame &&
  event.origin === window.location.origin &&
  (event.data as {source?: unknown} | null)?.source === PREVIEW_MESSAGE_SOURCE;

/**
 * My Account itself, in the design preview frame with its toolbar of device sizes, color schemes and zoom. The
 * frame runs My Account's own preview page, which renders the app's own shell, tabs and components with sample
 * data, so it looks exactly as My Account does. The draft is sent to it as it changes; hovering a tab or a
 * component there names it, and clicking one selects it here. When the layout can be changed, tabs and components
 * are dragged to a new place there, and its add space opens the menu of components the flow builder's steps open.
 */
export default function MyAccountPreview({
  application,
  editable,
  language,
  onAddTab,
  onChange,
  onRestoreTab,
  onSelect,
  pageUrl,
  selection,
  tabs,
  text,
  theme,
  toolbarPortal,
}: MyAccountPreviewProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const consoleTheme = useTheme();
  // The frame's window, set as soon as the page is written into it, before its scripts can announce they
  // are ready, so that announcement is never missed.
  const frame = useRef<Window | null>(null);
  const onSelectRef = useRef<typeof onSelect>(onSelect);
  const onChangeRef = useRef<typeof onChange>(onChange);
  const [ready, setReady] = useState<boolean>(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [addMenu, setAddMenu] = useState<AddMenu | null>(null);
  // Where the form that adds a menu item opens: beside the button under the preview's menu.
  const [addTabAt, setAddTabAt] = useState<AddMenu['position'] | null>(null);
  const addTab: MyAccountTab | undefined = addMenu
    ? tabs.find((tab: MyAccountTab) => tab.id === addMenu.tabId)
    : undefined;
  const addable: SectionCatalogEntry[] = addTab ? allowedSections(addTab) : [];
  const full: boolean = (addTab?.sections.length ?? 0) >= MAX_SECTIONS_PER_TAB;

  const state: PreviewState = useMemo(
    () =>
      buildPreviewState({
        t,
        accent: consoleTheme.palette.primary.main,
        application,
        colorScheme,
        designTheme: theme ?? null,
        editable,
        language,
        selection,
        tabs,
        text,
      }),
    [t, consoleTheme, application, colorScheme, theme, editable, language, selection, tabs, text],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
    onChangeRef.current = onChange;
  }, [onSelect, onChange]);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (!isPreviewMessage(event, frame.current)) return;
      const message: PreviewMessage = event.data;
      if (message.type === 'ready') {
        setReady(true);
      } else if (message.type === 'select') {
        onSelectRef.current(message.selection);
      } else if (message.type === 'openAdd') {
        const position = frame.current ? pagePosition(frame.current, message.anchor) : undefined;
        if (position) setAddMenu({tabId: message.tabId, position});
      } else if (message.type === 'openAddTab') {
        // Under the button's left edge, so the form opens over the preview rather than the Console's menu.
        const position = frame.current ? pagePosition(frame.current, {...message.anchor, width: 0}) : undefined;
        if (position) setAddTabAt(position);
      } else {
        onChangeRef.current(message);
      }
    };
    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    // Sent once the application's theme has loaded, so the preview never shows another design first.
    if (ready && theme !== null) {
      frame.current?.postMessage({source: PREVIEW_MESSAGE_SOURCE, type: 'state', state}, window.location.origin);
    }
  }, [ready, state, theme]);

  const onPageWindow = useCallback((window: Window): void => {
    frame.current = window;
  }, []);

  return (
    <>
      <GatePreview
        theme={undefined}
        pageUrl={pageUrl}
        displayName={application.name}
        toolbarPortal={toolbarPortal}
        onPageWindow={onPageWindow}
        onColorSchemeChange={setColorScheme}
      />
      {/* The menu the flow builder's steps open to add a component, opened beside the preview's add space. */}
      <Menu
        open={addMenu !== null}
        onClose={() => setAddMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={addMenu?.position}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
      >
        {full || addable.length === 0 ? (
          <MenuItem disabled sx={{minWidth: 200}}>
            {full
              ? t('preview.full', 'This page has as many components as it can show.')
              : t('preview.noComponents', 'No components available')}
          </MenuItem>
        ) : (
          addable.map((entry: SectionCatalogEntry) => (
            <MenuItem
              key={entry.type}
              onClick={() => {
                if (addMenu) onChange({type: 'add', tabId: addMenu.tabId, component: entry.type});
                setAddMenu(null);
              }}
              sx={{minWidth: 200}}
            >
              {t(entry.name[0], entry.name[1])}
            </MenuItem>
          ))
        )}
      </Menu>
      {/* The form that adds a menu item, opened under the button below the preview's menu. */}
      <Popover
        open={addTabAt !== null}
        onClose={() => setAddTabAt(null)}
        anchorReference="anchorPosition"
        anchorPosition={addTabAt ?? undefined}
        transformOrigin={{vertical: 'top', horizontal: 'left'}}
        slotProps={{paper: {sx: {width: 320}}}}
      >
        {tabs.length >= MAX_TABS ? (
          <Typography variant="body2" sx={{p: 2}}>
            {t('layout.tabsFull', 'My Account can have at most 12 menu items.')}
          </Typography>
        ) : (
          <AddTabForm
            onAdd={(name: string, icon: TabIconChoice) => {
              onAddTab(name, icon);
              setAddTabAt(null);
            }}
            removed={removedBuiltInTabs(tabs).map((tab: MyAccountTab) => ({
              tab,
              name: tabLabel(t, tab, text, language),
            }))}
            onRestore={(tabId: string) => {
              onRestoreTab(tabId);
              setAddTabAt(null);
            }}
            onCancel={() => setAddTabAt(null)}
          />
        )}
      </Popover>
    </>
  );
}
