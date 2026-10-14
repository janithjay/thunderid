// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getErrorMessage} from '@thunderid/utils';
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from '@wso2/oxygen-ui';
import type {JSX} from 'react';
import {useTranslation} from 'react-i18next';
import useRevokeSession from '../api/useRevokeSession';
import useRevokeUserSessions from '../api/useRevokeUserSessions';

/**
 * What to terminate: one session, or every session of a user.
 *
 * @public
 */
export type TerminateTarget = {sessionId: string} | {userId: string};

export interface TerminateSessionsDialogProps {
  target: TerminateTarget | null;
  onClose: () => void;
}

/**
 * Dialog that confirms terminating one session or all of a user's sessions. A failure stays in the dialog
 * so the user can retry.
 */
export default function TerminateSessionsDialog({target, onClose}: TerminateSessionsDialogProps): JSX.Element {
  const {t} = useTranslation('sessions');
  const revokeSession = useRevokeSession();
  const revokeUserSessions = useRevokeUserSessions();
  const isAll = target !== null && 'userId' in target;
  const mutation = isAll ? revokeUserSessions : revokeSession;

  const handleClose = (): void => {
    if (mutation.isPending) return;
    revokeSession.reset();
    revokeUserSessions.reset();
    onClose();
  };

  const handleConfirm = (): void => {
    if (target === null) return;
    const done = {onSuccess: onClose};
    if ('userId' in target) {
      revokeUserSessions.mutate(target.userId, done);
    } else {
      revokeSession.mutate(target.sessionId, done);
    }
  };

  return (
    <Dialog open={target !== null} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isAll ? t('terminateAll.title', 'Terminate all sessions') : t('terminate.title', 'Terminate session')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isAll
            ? t(
                'terminateAll.message',
                'The user is signed out on every device, and the tokens these sessions issued stop working. The next sign-in asks for credentials again.',
              )
            : t(
                'terminate.message',
                'The user is signed out on this device, and the tokens this session issued stop working. The next sign-in on it asks for credentials again.',
              )}
        </DialogContentText>
        {mutation.error && (
          <Alert severity="error" sx={{mt: 2}}>
            {isAll
              ? getErrorMessage(
                  mutation.error,
                  t,
                  'terminateAll.error',
                  'Failed to terminate the sessions. Please try again.',
                )
              : getErrorMessage(
                  mutation.error,
                  t,
                  'terminate.error',
                  'Failed to terminate the session. Please try again.',
                )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={mutation.isPending}>
          {t('common:actions.cancel', 'Cancel')}
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? t('terminate.terminating', 'Terminating...') : t('terminate.confirm', 'Terminate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
