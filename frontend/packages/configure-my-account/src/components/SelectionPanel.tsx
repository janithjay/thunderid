// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Box, Button, Checkbox, Divider, FormControlLabel, Stack, TextField, Typography} from '@wso2/oxygen-ui';
import {Trash2} from '@wso2/oxygen-ui-icons-react';
import type {JSX, ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import LanguagePicker from './LanguagePicker';
import {PanelField, PanelSection} from './PanelSection';
import TabIconPicker from './TabIconPicker';
import TextEditor from './TextEditor';
import WidgetEditor from './WidgetEditor';
import {CREDENTIAL_ATTRIBUTE_PATTERN, SECTION_CATALOG, type SectionCatalogEntry} from '../constants/catalog';
import type {MyAccountSection, MyAccountTab, MyAccountText} from '../models/my-account';
import {
  removeSection,
  removeSectionText,
  removeTab,
  setTabIcon,
  toggleSectionHidden,
  toggleTabHidden,
  updateSection,
} from '../utils/layoutEditing';
import type {PreviewSelection} from '../utils/previewState';

interface SelectionPanelProps {
  language: string;
  onChange: (tabs: MyAccountTab[], text: MyAccountText) => void;
  onLanguageChange: (language: string) => void;
  onSelect: (selection: PreviewSelection) => void;
  readOnly: boolean;
  selection: PreviewSelection;
  tabs: MyAccountTab[];
  text: MyAccountText;
}

interface HideFieldProps {
  checked: boolean;
  hint: string;
  onChange: () => void;
  readOnly: boolean;
}

// Hides a menu item or a component from users, while the editor keeps it, faded, to show again.
function HideField({checked, hint, onChange, readOnly}: HideFieldProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  return (
    <Box>
      <FormControlLabel
        control={<Checkbox checked={checked} disabled={readOnly} onChange={onChange} />}
        label={t('selection.hide', 'Hide')}
      />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ml: 4, mt: -0.5}}>
        {hint}
      </Typography>
    </Box>
  );
}

interface DeleteButtonProps {
  label: string;
  onDelete: () => void;
}

// The destructive action, set apart from the properties above it, as the flow builder's properties panel does.
function DeleteButton({label, onDelete}: DeleteButtonProps): JSX.Element {
  return (
    <Button
      fullWidth
      size="small"
      aria-label={label}
      startIcon={<Trash2 size={16} />}
      onClick={onDelete}
      sx={{
        justifyContent: 'flex-start',
        px: 1.5,
        py: 0.75,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        color: 'text.primary',
        fontWeight: 500,
        '& .MuiButton-startIcon': {color: 'error.main'},
        '&:hover': {borderColor: 'error.main', bgcolor: 'action.hover'},
      }}
    >
      {label}
    </Button>
  );
}

// The panel's body scrolls as one, with a line between its sections as the flow builder draws. The footer comes
// after the last section, at the bottom of the panel when the sections are short, and is reached by scrolling
// when they are long.
function PanelBody({children, footer = null}: {children: ReactNode; footer?: ReactNode}): JSX.Element {
  return (
    <Box sx={{flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', pt: 2, pb: 1}}>
      <Stack spacing={3} divider={<Divider flexItem />}>
        {children}
      </Stack>
      {footer && (
        <Box sx={{mt: 'auto', pt: 3}}>
          <Box sx={{pt: 2, borderTop: 1, borderColor: 'divider'}}>{footer}</Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * The properties of what is selected in the preview, grouped as the flow builder's properties panel groups them:
 * a menu item, with whether it shows and its text, or a component. A widget is built here from its blocks, a
 * credential component names the credential it changes, and the other components are used as they are. Text is
 * edited in the language picked under Localization.
 */
export default function SelectionPanel({
  language,
  onChange,
  onLanguageChange,
  onSelect,
  readOnly,
  selection,
  tabs,
  text,
}: SelectionPanelProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const tab: MyAccountTab | undefined = tabs.find((item: MyAccountTab) => item.id === selection.tabId);
  const section: MyAccountSection | undefined = tab?.sections.find(
    (item: MyAccountSection) => item.id === selection.sectionId,
  );

  if (!tab) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{pt: 2}}>
        {t('selection.none', 'Select a menu item or a component in the preview.')}
      </Typography>
    );
  }

  const localization: JSX.Element = (
    <PanelSection title={t('selection.localization', 'Localization')}>
      <LanguagePicker
        language={language}
        languages={Object.keys(text)}
        readOnly={readOnly}
        onChange={onLanguageChange}
      />
    </PanelSection>
  );

  if (section) {
    const entry: SectionCatalogEntry | undefined = SECTION_CATALOG.find((item) => item.type === section.type);
    const attribute: string = section.attribute ?? '';
    const change = (next: MyAccountSection, nextText: MyAccountText = text): void =>
      onChange(
        updateSection(tabs, tab.id, section.id, () => next),
        nextText,
      );
    return (
      <PanelBody
        footer={
          !readOnly && (
            <DeleteButton
              label={t('selection.delete', 'Delete')}
              onDelete={() => {
                onChange(removeSection(tabs, tab.id, section.id), removeSectionText(text, section.id));
                onSelect({tabId: tab.id});
              }}
            />
          )
        }
      >
        <PanelSection title={t('selection.general', 'General')}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{entry ? t(entry.name[0], entry.name[1]) : section.type}</Typography>
            {entry && (
              <Typography variant="body2" color="text.secondary">
                {t(entry.description[0], entry.description[1])}
              </Typography>
            )}
          </Stack>
          <HideField
            checked={Boolean(section.hidden)}
            readOnly={readOnly}
            hint={t('selection.hideComponentHint', "Users don't see this component. It stays here, faded.")}
            onChange={() => onChange(toggleSectionHidden(tabs, tab.id, section.id), text)}
          />
          {section.type !== 'widget' && section.type !== 'credential' && (
            <Typography variant="body2" color="text.secondary">
              {t('selection.asIs', 'This component is used as it is.')}
            </Typography>
          )}
        </PanelSection>

        {section.type === 'credential' && (
          <PanelSection title={t('selection.settings', 'Settings')}>
            <PanelField
              id="my-account-credential-attribute"
              label={t('selection.attribute', 'Credential attribute')}
              helperText={t(
                'selection.attributeHint',
                'The name of the credential attribute in the user type, such as password or pin.',
              )}
              error={!CREDENTIAL_ATTRIBUTE_PATTERN.test(attribute)}
              required
            >
              <TextField
                id="my-account-credential-attribute"
                size="small"
                value={attribute}
                error={!CREDENTIAL_ATTRIBUTE_PATTERN.test(attribute)}
                onChange={(event) => change({...section, attribute: event.target.value.trim()})}
                slotProps={{input: {readOnly}, htmlInput: {maxLength: 64}}}
                fullWidth
              />
            </PanelField>
          </PanelSection>
        )}

        {section.type === 'widget' && (
          <PanelSection title={t('selection.content', 'Content')}>
            <WidgetEditor widget={section} text={text} language={language} readOnly={readOnly} onChange={change} />
          </PanelSection>
        )}
        {section.type === 'widget' && localization}
      </PanelBody>
    );
  }

  return (
    <PanelBody
      footer={
        !readOnly && (
          <DeleteButton
            label={t('selection.delete', 'Delete')}
            onDelete={() => {
              onChange(removeTab(tabs, tab.id), text);
              onSelect({tabId: tabs.find((item: MyAccountTab) => item.id !== tab.id)?.id ?? ''});
            }}
          />
        )
      }
    >
      <PanelSection title={t('selection.general', 'General')}>
        <Typography variant="subtitle2">
          {tab.custom ? t('selection.customTab', 'Custom menu item') : t('selection.tab', 'Menu item')}
        </Typography>
        <HideField
          checked={Boolean(tab.hidden)}
          readOnly={readOnly}
          hint={t('selection.hideTabHint', "Users don't see this menu item. It stays here, faded.")}
          onChange={() => onChange(toggleTabHidden(tabs, tab.id), text)}
        />
      </PanelSection>
      <PanelSection title={t('selection.appearance', 'Appearance')}>
        <TabIconPicker
          key={tab.id}
          idPrefix="my-account-tab-icon"
          builtInTab={tab.custom ? undefined : tab}
          readOnly={readOnly}
          value={{icon: tab.icon, iconUrl: tab.iconUrl}}
          onChange={(choice) => onChange(setTabIcon(tabs, tab.id, choice), text)}
        />
      </PanelSection>
      <PanelSection title={t('selection.text', 'Text')}>
        <TextEditor
          tab={tab}
          text={text}
          language={language}
          readOnly={readOnly}
          onChange={(next: MyAccountText) => onChange(tabs, next)}
        />
      </PanelSection>
      {localization}
    </PanelBody>
  );
}
