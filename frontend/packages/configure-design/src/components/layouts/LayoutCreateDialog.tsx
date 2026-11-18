// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useCreateLayout, useGetLayout, type LayoutListItem, type LayoutResponse} from '@thunderid/design';
import {getErrorMessage} from '@thunderid/utils';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormHelperText,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
} from '@wso2/oxygen-ui';
import {useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import uniqueLayoutHandle from '../../utils/uniqueLayoutHandle';

export interface LayoutCreateDialogProps {
  /** The layouts the project has: a new one starts as a copy of one of them, and takes a handle none has. */
  layouts: LayoutListItem[];
  onClose: () => void;
  /** Called with the new layout once it is created, to open it. */
  onCreated: (layout: LayoutResponse) => void;
  open: boolean;
  /** The project the layout belongs to, when the Console is scoped to one. */
  projectId?: string;
}

/**
 * Creates a layout from a name, as a copy of a layout the project has, so it starts from a page that already
 * works and is changed in the layout builder. A layout is used by an application once it is picked there.
 */
export default function LayoutCreateDialog({
  layouts,
  onClose,
  onCreated,
  open,
  projectId = undefined,
}: LayoutCreateDialogProps): JSX.Element {
  const {t} = useTranslation('design');
  const createLayout = useCreateLayout();
  const [name, setName] = useState<string>('');
  const [chosenSource, setChosenSource] = useState<string>('');
  const sourceId: string = chosenSource || (layouts[0]?.id ?? '');
  const source = useGetLayout(open ? sourceId : '');
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    if (createLayout.isPending) return;
    setName('');
    setChosenSource('');
    setError(null);
    onClose();
  };

  const create = (): void => {
    if (!source.data || name.trim() === '') return;
    setError(null);
    createLayout.mutate(
      {
        handle: uniqueLayoutHandle(name, layouts),
        displayName: name.trim(),
        layout: source.data.layout,
        ...(projectId ? {projectId} : {}),
      },
      {
        onSuccess: (layout: LayoutResponse) => {
          setName('');
          setChosenSource('');
          onCreated(layout);
        },
        onError: (err: Error) =>
          setError(
            getErrorMessage(
              err,
              t,
              'layouts.errors.create_failed.message',
              'Failed to create layout. Please try again.',
            ),
          ),
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <Stack
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <DialogTitle>{t('layouts.create.title', 'Add layout')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb: 3}}>
            {t(
              'layouts.create.description',
              'A new layout starts as a copy of one you have. Change it in the layout builder, then pick it for an application.',
            )}
          </DialogContentText>
          <Stack spacing={2.5}>
            <FormControl fullWidth required>
              <FormLabel htmlFor="layout-create-name">{t('layouts.create.fields.name', 'Name')}</FormLabel>
              <TextField
                id="layout-create-name"
                size="small"
                value={name}
                placeholder={t('layouts.create.fields.name_placeholder', 'Sign-in with picture')}
                onChange={(event) => setName(event.target.value)}
                slotProps={{htmlInput: {maxLength: 100}}}
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth>
              <FormLabel id="layout-create-source-label" htmlFor="layout-create-source">
                {t('layouts.create.fields.source', 'Start from')}
              </FormLabel>
              <TextField
                id="layout-create-source"
                select
                size="small"
                value={sourceId}
                onChange={(event) => setChosenSource(event.target.value)}
                slotProps={{select: {labelId: 'layout-create-source-label'}}}
                fullWidth
              >
                {layouts.map((layout: LayoutListItem) => (
                  <MenuItem key={layout.id} value={layout.id}>
                    {layout.displayName}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText>
                {t('layouts.create.fields.source_hint', 'Its settings, custom CSS and side panel are copied.')}
              </FormHelperText>
            </FormControl>
          </Stack>
          {source.isError && (
            <Alert severity="error" sx={{mt: 2}}>
              {t('layouts.config.errors.load.message', 'Failed to load layout configuration.')}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{mt: 2}}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={createLayout.isPending}>
            {t('common:actions.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createLayout.isPending || name.trim() === '' || !source.data}
          >
            {createLayout.isPending
              ? t('common:status.creating', 'Creating...')
              : t('layouts.create.actions.create', 'Create layout')}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
