// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BuilderStaticPanel, DocumentTitle, PageLoadingAnimation, QueryErrorNotice} from '@thunderid/components';
import {DesignUIConstants} from '@thunderid/configure-design';
import {useCapabilitiesContext} from '@thunderid/contexts';
import {getErrorMessage} from '@thunderid/utils';
import {
  Alert,
  Box,
  Button,
  IconButton,
  PageContent,
  PageTitle,
  Stack,
  Tooltip,
  Typography,
  useColorScheme,
} from '@wso2/oxygen-ui';
import {Save, Undo2, X} from '@wso2/oxygen-ui-icons-react';
import {useMemo, useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import useGetApplicationTheme from '../api/useGetApplicationTheme';
import useGetMyAccountApplication from '../api/useGetMyAccountApplication';
import useGetProjectApplications, {type ApplicationOption} from '../api/useGetProjectApplications';
import useSaveMyAccountLayout from '../api/useSaveMyAccountLayout';
import MyAccountPreview, {type PreviewChange} from '../components/MyAccountPreview';
import SelectionPanel from '../components/SelectionPanel';
import {DEFAULT_TEXT_LANGUAGE} from '../constants/catalog';
import type {MyAccountApplication, MyAccountSection, MyAccountTab, MyAccountText} from '../models/my-account';
import {sectionName, tabLabel} from '../utils/labels';
import {
  addComponent,
  addCustomTab,
  layoutOf,
  layoutProblem,
  moveBefore,
  moveSection,
  restoreBuiltInTab,
  setText,
  type TabIconChoice,
  uniqueId,
  usedIds,
} from '../utils/layoutEditing';
import type {PreviewSelection} from '../utils/previewState';

/** The tabs and text being edited, before they are saved. */
interface Draft {
  tabs: MyAccountTab[];
  text: MyAccountText;
}

// How the project's My Account application is found: by the client ID My Account signs in with, else by its name.
const MY_ACCOUNT_CLIENT_ID = 'MY_ACCOUNT';
const MY_ACCOUNT_APPLICATION_NAME = 'My Account';

const findMyAccountApplication = (options: ApplicationOption[]): ApplicationOption | undefined =>
  options.find((option: ApplicationOption) => option.clientId === MY_ACCOUNT_CLIENT_ID) ??
  options.find((option: ApplicationOption) => option.name === MY_ACCOUNT_APPLICATION_NAME);

interface MyAccountEditorProps {
  application: MyAccountApplication;
  previewUrl: string;
}

/**
 * Edits the layout of one application in a builder like the flow builder: My Account itself fills the canvas in
 * the application's design, and what is selected in it shows its properties on the right. Hovering the preview
 * names each menu item and component, clicking one selects it, and dragging one moves it. The button under its
 * menu adds a menu item, and the add space at the end of a page adds a component. Hidden menu items and
 * components stay in the preview, faded. The layout is saved in the application's metadata, and reaches users
 * once the project is deployed.
 */
function MyAccountEditor({application, previewUrl}: MyAccountEditorProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const {mode, systemMode} = useColorScheme();
  // The canvas behind the preview frame, as the design builders draw it.
  const canvasColor: string = (systemMode ?? mode) === 'dark' ? '#141414' : '#f6f7f9';
  const {can} = useCapabilitiesContext();
  const save = useSaveMyAccountLayout();
  const theme = useGetApplicationTheme(application.themeId);
  const saved: Draft = useMemo(() => layoutOf(application), [application]);
  const brand: {logoUrl?: string; name: string} = useMemo(
    () => ({
      name: application.name,
      logoUrl: typeof application['logoUrl'] === 'string' ? application['logoUrl'] : undefined,
    }),
    [application],
  );
  const [draft, setDraft] = useState<Draft>(saved);
  const [language, setLanguage] = useState<string>(DEFAULT_TEXT_LANGUAGE);
  const [selection, setSelection] = useState<PreviewSelection>({tabId: saved.tabs[0]?.id ?? ''});
  // The properties panel closes with its close button, and opens again when something is selected.
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const [toolbarPortal, setToolbarPortal] = useState<HTMLDivElement | null>(null);
  const readOnly = Boolean(application.isReadOnly) || !can('app', 'update');

  const dirty: boolean = JSON.stringify(draft) !== JSON.stringify(saved);
  const problem: [string, string] | undefined = layoutProblem(draft.tabs, draft.text);

  const select = (next: PreviewSelection): void => {
    setSelection(next);
    setPanelOpen(true);
  };

  const change = (tabs: MyAccountTab[], text: MyAccountText): void => {
    save.reset();
    setDraft({tabs, text});
  };

  // A change the preview asks for: a component added from its add space, or a tab or component dropped in place.
  const applyPreviewChange = (previewChange: PreviewChange): void => {
    if (readOnly) return;
    if (previewChange.type === 'moveTab') {
      change(moveBefore(draft.tabs, previewChange.id, previewChange.beforeId), draft.text);
    } else if (previewChange.type === 'moveSection') {
      change(moveSection(draft.tabs, previewChange.tabId, previewChange.id, previewChange.beforeId), draft.text);
    } else {
      const added = addComponent(draft.tabs, draft.text, previewChange.tabId, previewChange.component, language, {
        heading: t('widget.newHeading', 'New widget'),
        body: t('widget.newBody', 'Tell your users what this is about.'),
      });
      if (added) {
        change(added.tabs, added.text);
        select({tabId: previewChange.tabId, sectionId: added.sectionId});
      }
    }
  };

  // A menu item named in the form the preview's menu opens: it starts empty, and is selected to fill.
  const addTab = (name: string, icon: TabIconChoice): void => {
    if (readOnly) return;
    const id: string = uniqueId(name, usedIds(draft.tabs));
    change(addCustomTab(draft.tabs, id, icon), setText(draft.text, language, `tabs.${id}`, name));
    select({tabId: id});
  };

  // A built-in menu item deleted earlier, brought back from the same form, with its components.
  const restoreTab = (tabId: string): void => {
    if (readOnly) return;
    change(restoreBuiltInTab(draft.tabs, tabId), draft.text);
    select({tabId});
  };

  const selectedTab: MyAccountTab | undefined = draft.tabs.find((tab: MyAccountTab) => tab.id === selection.tabId);
  const selectedSection: MyAccountSection | undefined = selectedTab?.sections.find(
    (section: MyAccountSection) => section.id === selection.sectionId,
  );
  let panelTitle: string = t('selection.title', 'Selection');
  if (selectedSection) {
    panelTitle = sectionName(t, selectedSection);
  } else if (selectedTab) {
    panelTitle = tabLabel(t, selectedTab, draft.text, language);
  }

  return (
    // The builder fills the page area exactly and its panels scroll inside it: the page takes no height from
    // its content, so it does not grow to fit the panels, and the builder is laid over it.
    <Box sx={{position: 'relative', width: '100%', minHeight: 0}}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'var(--flow-builder-background-color)',
          '[data-color-scheme="dark"] &': {
            bgcolor: 'var(--flow-builder-background-color-dark)',
          },
        }}
      >
        <DocumentTitle title={t('page.title', 'My Account')} />
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, flexShrink: 0}}>
          <Box ref={setToolbarPortal} sx={{flex: 1, display: 'flex', justifyContent: 'center'}} />
          <Box sx={{display: 'flex', gap: 2}}>
            <Button
              variant="outlined"
              disabled={!dirty || save.isPending}
              startIcon={<Undo2 size={18} />}
              onClick={() => change(saved.tabs, saved.text)}
            >
              {t('actions.revert', 'Revert')}
            </Button>
            <Button
              variant="contained"
              disabled={!dirty || readOnly || problem !== undefined || save.isPending}
              startIcon={<Save size={18} />}
              onClick={() => save.mutate({application, layout: {tabs: draft.tabs, text: draft.text}})}
            >
              {save.isPending ? t('common:status.saving', 'Saving') : t('actions.save', 'Save')}
            </Button>
          </Box>
        </Box>

        {(readOnly || problem !== undefined || save.isError) && (
          <Stack spacing={1} sx={{px: 2, pb: 1}}>
            {application.isReadOnly && (
              <Alert severity="info">
                {t(
                  'readOnly',
                  'This application is deployed from a file or another plane, so its layout cannot be changed here.',
                )}
              </Alert>
            )}
            {problem && <Alert severity="warning">{t(problem[0], problem[1])}</Alert>}
            {save.isError && (
              <Alert severity="error">
                {getErrorMessage(save.error, t, 'myAccountConfig:save.error', 'My Account could not be saved.')}
              </Alert>
            )}
          </Stack>
        )}

        {/* The preview on the canvas, and the properties of what is selected in it on the right. */}
        <Box sx={{flex: 1, overflow: 'hidden', p: 1, pt: 0, display: 'flex'}}>
          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 1,
              bgcolor: canvasColor,
            }}
          >
            <MyAccountPreview
              editable={!readOnly}
              onChange={applyPreviewChange}
              onAddTab={addTab}
              onRestoreTab={restoreTab}
              pageUrl={previewUrl}
              application={brand}
              theme={theme}
              tabs={draft.tabs}
              text={draft.text}
              language={language}
              selection={selection}
              onSelect={select}
              toolbarPortal={toolbarPortal}
            />
          </Box>
          <BuilderStaticPanel
            open={panelOpen}
            width={DesignUIConstants.RIGHT_PANEL_WIDTH}
            header={
              <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                <Typography variant="h6" noWrap>
                  {panelTitle}
                </Typography>
                <Tooltip title={t('selection.close', 'Close properties')}>
                  <IconButton
                    size="small"
                    aria-label={t('selection.close', 'Close properties')}
                    onClick={() => setPanelOpen(false)}
                  >
                    <X size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          >
            <SelectionPanel
              tabs={draft.tabs}
              text={draft.text}
              language={language}
              selection={selection}
              readOnly={readOnly}
              onSelect={select}
              onLanguageChange={setLanguage}
              onChange={change}
            />
          </BuilderStaticPanel>
        </Box>
      </Box>
    </Box>
  );
}

interface MyAccountPageProps {
  /** The address of My Account's preview page, which the Console serves next to its own. */
  previewUrl: string;
}

/**
 * The My Account page of the console: how My Account is laid out for the users of the project's My Account
 * application, with a live preview. The layout is kept in the application's metadata, and My Account renders it
 * once the project is deployed, without being rebuilt.
 *
 * @public
 */
export default function MyAccountPage({previewUrl}: MyAccountPageProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const applications = useGetProjectApplications();
  const applicationId: string | undefined = findMyAccountApplication(applications.data ?? [])?.id;
  const application = useGetMyAccountApplication(applicationId);

  if (application.data) {
    return <MyAccountEditor key={application.data.id} application={application.data} previewUrl={previewUrl} />;
  }

  let body: JSX.Element;
  if (applications.isLoading || application.isLoading) {
    body = <PageLoadingAnimation />;
  } else if (applications.isError) {
    body = <QueryErrorNotice error={applications.error} t={t} onRetry={() => void applications.refetch()} />;
  } else if (application.isError) {
    body = <QueryErrorNotice error={application.error} t={t} onRetry={() => void application.refetch()} />;
  } else {
    body = (
      <Alert severity="info">
        {t(
          'application.missing',
          'This project has no My Account application. Add the My Account application to the project to customize My Account.',
        )}
      </Alert>
    );
  }

  return (
    <PageContent>
      <DocumentTitle title={t('page.title', 'My Account')} />
      <PageTitle>
        <PageTitle.Header>{t('page.title', 'My Account')}</PageTitle.Header>
        <PageTitle.SubHeader>
          {t(
            'page.subtitle',
            'Choose what your users see in My Account: its menu items, the components on each page, and their text. Changes reach users when you deploy the project.',
          )}
        </PageTitle.SubHeader>
      </PageTitle>
      {body}
    </PageContent>
  );
}
