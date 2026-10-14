// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render, screen} from '@thunderid/test-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TerminateSessionsDialog from '../TerminateSessionsDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, arg?: unknown): string => {
      if (typeof arg === 'string') return arg;
      return (arg as {defaultValue?: string} | undefined)?.defaultValue ?? key;
    },
  }),
}));

const {revoke, revokeAll} = vi.hoisted(() => ({
  revoke: {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as Error | null},
  revokeAll: {mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as Error | null},
}));
vi.mock('../../api/useRevokeSession', () => ({default: () => revoke}));
vi.mock('../../api/useRevokeUserSessions', () => ({default: () => revokeAll}));

describe('TerminateSessionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revoke.error = null;
    revoke.isPending = false;
  });

  it('closes only after the termination succeeds', () => {
    const onClose = vi.fn();
    revoke.mutate.mockImplementation((_id: string, options: {onSuccess: () => void}) => options.onSuccess());

    render(<TerminateSessionsDialog target={{sessionId: 'sess-1'}} onClose={onClose} />);
    expect(screen.getByText('Terminate session')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Terminate'}));

    expect(revoke.mutate).toHaveBeenCalledWith('sess-1', expect.any(Object));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps a failure in the dialog', () => {
    revoke.error = new Error('boom');

    render(<TerminateSessionsDialog target={{sessionId: 'sess-1'}} onClose={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to terminate the session. Please try again.');
  });

  it('cancels and clears a previous failure', () => {
    const onClose = vi.fn();

    render(<TerminateSessionsDialog target={{userId: 'user-1'}} onClose={onClose} />);
    expect(screen.getByText('Terminate all sessions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(revoke.reset).toHaveBeenCalled();
    expect(revokeAll.reset).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(revokeAll.mutate).not.toHaveBeenCalled();
  });

  it('can’t be closed while terminating', () => {
    const onClose = vi.fn();
    revoke.isPending = true;

    render(<TerminateSessionsDialog target={{sessionId: 'sess-1'}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'Terminating...'})).toBeDisabled();
  });
});
