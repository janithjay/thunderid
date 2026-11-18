// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useGetLayout, useUpdateLayout, type LayoutSidePanel, type Stylesheet} from '@thunderid/design';
import {getErrorMessage} from '@thunderid/utils';
import {Alert, Box, CircularProgress, Divider, Typography} from '@wso2/oxygen-ui';
import {useCallback, useEffect, useMemo, useRef, useState, type JSX, type RefObject} from 'react';
import {useTranslation} from 'react-i18next';
import CustomCSSEditor from './layouts/CustomCSSEditor';
import type {CustomCSSEditorHandle} from './layouts/CustomCSSEditor';
import ScreenEditor from './layouts/ScreenEditor';
import SidePanelEditor from './layouts/SidePanelEditor';

interface LayoutConfigPanelProps {
  layoutId: string | null;
  selectedScreen: string | null;
  onScreenChange: (screen: string) => void;
  screenDraft: Record<string, unknown> | null;
  onScreenDraftChange: (draft: Record<string, unknown>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  saveHandlerRef?: RefObject<() => void>;
  stylesheets?: Stylesheet[];
  onStylesheetsChange?: (stylesheets: Stylesheet[]) => void;
  cssEditorRef?: RefObject<CustomCSSEditorHandle | null>;
  /** The panel beside the sign-in form, as the draft holds it. */
  sidePanel?: LayoutSidePanel;
  /** Edits the side panel. Without it, the panel is neither shown for editing nor saved. */
  onSidePanelChange?: (panel: LayoutSidePanel) => void;
  /** The side panel block being edited, shared with the preview. */
  selectedSidePanelBlock?: string | null;
  onSelectSidePanelBlock?: (blockId: string | null) => void;
}

/** A heading for one of the layout-wide sections of the panel. */
function SectionTitle({children}: {children: string}): JSX.Element {
  return (
    <Typography variant="subtitle2" component="h3" sx={{px: 1.5, pt: 1.5}}>
      {children}
    </Typography>
  );
}

function setIn(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  const [head, ...rest] = path;
  if (rest.length === 0) return {...obj, [head]: value};
  return {
    ...obj,
    [head]: setIn((obj[head] ?? {}) as Record<string, unknown>, rest, value),
  };
}

export default function LayoutConfigPanel({
  layoutId,
  selectedScreen,
  onScreenChange,
  screenDraft,
  onScreenDraftChange,
  onDirtyChange = () => null,
  saveHandlerRef = undefined,
  stylesheets = [],
  onStylesheetsChange = undefined,
  cssEditorRef = undefined,
  sidePanel = undefined,
  onSidePanelChange = undefined,
  selectedSidePanelBlock = null,
  onSelectSidePanelBlock = undefined,
}: LayoutConfigPanelProps): JSX.Element {
  const {t} = useTranslation('design');
  const {data: layout, isLoading} = useGetLayout(layoutId ?? '');
  const {mutateAsync} = useUpdateLayout();
  const [saveError, setSaveError] = useState<string | null>(null);

  const screens = useMemo(() => (layout?.layout?.screens ?? {}) as Record<string, Record<string, unknown>>, [layout]);
  const screenNames = Object.keys(screens);

  /**
   * Pick first screen when layout loads and none is selected yet
   */
  useEffect(() => {
    if (screenNames.length > 0 && !selectedScreen) {
      onScreenChange(screenNames[0]);
    }
  }, [screenNames.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Sync draft from server when selected screen or layout data changes
   */
  useEffect(() => {
    if (selectedScreen && screens[selectedScreen]) {
      onScreenDraftChange(JSON.parse(JSON.stringify(screens[selectedScreen])) as Record<string, unknown>);
      onDirtyChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScreen, layout]);

  const updateField = (path: string[], value: unknown): void => {
    if (!screenDraft) return;
    setSaveError(null);
    onScreenDraftChange(setIn(screenDraft, path, value));
    onDirtyChange?.(true);
  };

  const handleStylesheetsChange = (next: Stylesheet[]): void => {
    setSaveError(null);
    onStylesheetsChange?.(next);
  };

  const handleSave = useCallback(() => {
    if (!layout) return;

    setSaveError(null);
    let updatedLayout = {...layout.layout};

    // Merge screen draft if a screen is selected
    if (selectedScreen && screenDraft) {
      updatedLayout = {...updatedLayout, screens: {...screens, [selectedScreen]: screenDraft}};
    }

    // Only touch head.stylesheets when stylesheet editing is active
    if (onStylesheetsChange) {
      if (stylesheets.length > 0) {
        updatedLayout = {...updatedLayout, head: {...(updatedLayout.head ?? {}), stylesheets}};
      } else {
        const headCopy = {...((updatedLayout.head ?? {}) as Record<string, unknown>)};
        delete headCopy['stylesheets'];
        updatedLayout = {...updatedLayout, head: headCopy};
      }
    }

    // Only touch sidePanel when side panel editing is active
    if (onSidePanelChange) {
      if (sidePanel) {
        updatedLayout = {...updatedLayout, sidePanel};
      } else {
        delete updatedLayout.sidePanel;
      }
    }

    mutateAsync({
      layoutId: layout.id,
      data: {handle: layout.handle, displayName: layout.displayName, layout: updatedLayout},
    })
      .then(() => onDirtyChange?.(false))
      .catch((err: Error) => {
        setSaveError(
          getErrorMessage(err, t, 'layouts.config.errors.save.message', 'Failed to save layout. Please try again.'),
        );
      });
  }, [
    screenDraft,
    layout,
    selectedScreen,
    screens,
    stylesheets,
    onStylesheetsChange,
    sidePanel,
    onSidePanelChange,
    mutateAsync,
    onDirtyChange,
    t,
  ]);

  // Keep the parent's save ref pointing to the latest handleSave
  const handleSaveLatest = useRef(handleSave);
  handleSaveLatest.current = handleSave;

  useEffect(() => {
    if (saveHandlerRef) {
      saveHandlerRef.current = () => handleSaveLatest.current();
    }
  }, [saveHandlerRef]);

  if (!layoutId) {
    return (
      <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3}}>
        <Typography variant="body2" color="text.secondary" align="center">
          {t('layouts.config.select_layout.message', 'Select a layout to view constraints')}
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!layout) {
    return (
      <Box sx={{p: 2}}>
        <Typography variant="body2" color="text.secondary">
          {t('layouts.config.errors.load.message', 'Failed to load layout configuration.')}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {saveError && (
        <Alert severity="error" sx={{m: 1.5, mb: 0}} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* Screen config editor */}
      {screenDraft && selectedScreen && <ScreenEditor screenDraft={screenDraft} onUpdate={updateField} />}

      {/* Side panel beside the sign-in form — layout-level, not per-screen */}
      {onSidePanelChange && (
        <>
          <SectionTitle>{t('layouts.config.side_panel.title', 'Side panel')}</SectionTitle>
          <SidePanelEditor
            panel={sidePanel}
            onChange={onSidePanelChange}
            selectedBlockId={selectedSidePanelBlock}
            onSelectBlock={onSelectSidePanelBlock}
          />
          <Divider />
          {onStylesheetsChange && <SectionTitle>{t('layouts.config.custom_css.title', 'Custom CSS')}</SectionTitle>}
        </>
      )}

      {/* Custom CSS — layout-level, not per-screen */}
      {onStylesheetsChange && (
        <CustomCSSEditor ref={cssEditorRef} stylesheets={stylesheets} onChange={handleStylesheetsChange} />
      )}
    </>
  );
}
