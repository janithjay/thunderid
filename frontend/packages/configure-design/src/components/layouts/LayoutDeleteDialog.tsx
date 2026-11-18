// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useDeleteLayout} from '@thunderid/design';
import {getErrorMessage} from '@thunderid/utils';
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from '@wso2/oxygen-ui';
import {useState, type JSX} from 'react';
import {useTranslation} from 'react-i18next';

export interface LayoutDeleteDialogProps {
  layoutId: string | null;
  layoutName: string | null;
  onClose: () => void;
  open: boolean;
}

/** Confirms deleting a layout. Applications that use it go back to the default layout. */
export default function LayoutDeleteDialog({
  layoutId,
  layoutName,
  onClose,
  open,
}: LayoutDeleteDialogProps): JSX.Element {
  const {t} = useTranslation('design');
  const deleteLayout = useDeleteLayout();
  const [error, setError] = useState<string | null>(null);

  const cancel = (): void => {
    if (deleteLayout.isPending) return;
    setError(null);
    if (deleteLayout.isError) {
      deleteLayout.reset();
    }
    onClose();
  };

  const confirm = (): void => {
    if (!layoutId) return;
    setError(null);
    deleteLayout.mutate(layoutId, {
      onSuccess: () => onClose(),
      onError: (err: Error) =>
        setError(getErrorMessage(err, t, 'layouts.delete.error', 'Failed to delete layout. Please try again.')),
    });
  };

  return (
    <Dialog open={open} onClose={cancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t('layouts.delete.title', 'Delete layout')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{mb: 2}}>
          {t('layouts.delete.message', 'Are you sure you want to delete "{{name}}"?', {name: layoutName ?? ''})}
        </DialogContentText>
        <Alert severity="warning">
          {t(
            'layouts.delete.disclaimer',
            'This cannot be undone. Applications that use this layout go back to the default layout.',
          )}
        </Alert>
        {error && (
          <Alert severity="error" sx={{mt: 2}}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={deleteLayout.isPending}>
          {t('common:actions.cancel', 'Cancel')}
        </Button>
        <Button onClick={confirm} color="error" variant="contained" disabled={deleteLayout.isPending || !layoutId}>
          {deleteLayout.isPending ? t('common:status.deleting', 'Deleting...') : t('common:actions.delete', 'Delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
