// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Box, Button, Divider, Stack, TextField, Typography} from '@wso2/oxygen-ui';
import {Undo2} from '@wso2/oxygen-ui-icons-react';
import {useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import {PanelField} from './PanelSection';
import TabIcon from './TabIcon';
import TabIconPicker from './TabIconPicker';
import type {MyAccountTab} from '../models/my-account';
import type {TabIconChoice} from '../utils/layoutEditing';

interface AddTabFormProps {
  onAdd: (name: string, icon: TabIconChoice) => void;
  onCancel: () => void;
  /** Brings back a built-in menu item that was deleted. */
  onRestore?: (tabId: string) => void;
  /** The built-in menu items that were deleted, with their names, which can be brought back. */
  removed?: {name: string; tab: MyAccountTab}[];
}

/**
 * Names a new tab and picks its icon, beside the button under the preview's menu, or brings back a built-in tab
 * that was deleted. A new tab starts empty; components are added to it from the catalog.
 */
export default function AddTabForm({
  onAdd,
  onCancel,
  onRestore = undefined,
  removed = [],
}: AddTabFormProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<TabIconChoice>({icon: 'info'});

  return (
    <Box
      component="form"
      aria-label={t('addTab.title', 'Add a new feature')}
      sx={{p: 2}}
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() !== '') {
          onAdd(name.trim(), icon);
        }
      }}
    >
      <Stack spacing={2}>
        <Typography variant="subtitle2">{t('addTab.title', 'Add a new feature')}</Typography>
        <PanelField
          id="my-account-tab-name"
          label={t('addTab.name', 'Name')}
          helperText={t('addTab.nameHint', 'Shown in the menu, in the language selected under Localization.')}
          required
        >
          <TextField
            id="my-account-tab-name"
            size="small"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
          />
        </PanelField>
        <TabIconPicker idPrefix="my-account-new-tab-icon" value={icon} onChange={setIcon} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={onCancel}>
            {t('common:actions.cancel', 'Cancel')}
          </Button>
          <Button size="small" type="submit" variant="contained" disabled={name.trim() === ''}>
            {t('addTab.add', 'Add feature')}
          </Button>
        </Stack>

        {onRestore && removed.length > 0 && (
          <>
            <Divider />
            <Typography variant="subtitle2">{t('addTab.restoreTitle', 'Bring back a built-in menu item')}</Typography>
            <Stack spacing={1}>
              {removed.map(({name: removedName, tab}) => (
                <Button
                  key={tab.id}
                  size="small"
                  variant="outlined"
                  startIcon={<TabIcon tab={tab} />}
                  endIcon={<Undo2 size={14} />}
                  onClick={() => onRestore(tab.id)}
                  sx={{justifyContent: 'space-between'}}
                >
                  {removedName}
                </Button>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
}
