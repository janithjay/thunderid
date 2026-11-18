// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {renderHook, waitFor} from '@thunderid/test-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DEFAULT_TABS} from '../../constants/catalog';
import type {MyAccountApplication, MyAccountLayout} from '../../models/my-account';
import useSaveMyAccountLayout from '../useSaveMyAccountLayout';

vi.mock('@thunderid/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@thunderid/react')>()),
  useThunderID: vi.fn(),
}));

vi.mock('@thunderid/contexts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@thunderid/contexts')>()),
  useConfig: vi.fn(),
  useToast: vi.fn(),
}));

const {useThunderID} = await import('@thunderid/react');
const {useConfig, useToast} = await import('@thunderid/contexts');

describe('useSaveMyAccountLayout', () => {
  let request: ReturnType<typeof vi.fn>;

  const application: MyAccountApplication = {
    id: 'app-1',
    name: 'My Account',
    url: 'https://localhost:8090/myaccount',
    certificate: {type: 'NONE'},
    metadata: {team: 'identity', myAccount: {tabs: []}},
  };
  const layout: MyAccountLayout = {tabs: DEFAULT_TABS, text: {'en-US': {'tabs.home': 'Overview'}}};

  beforeEach(() => {
    request = vi.fn().mockResolvedValue({data: {...application, metadata: {team: 'identity', myAccount: layout}}});
    vi.mocked(useThunderID).mockReturnValue({http: {request}} as unknown as ReturnType<typeof useThunderID>);
    vi.mocked(useConfig).mockReturnValue({
      getServerUrl: () => 'https://localhost:8090',
    } as unknown as ReturnType<typeof useConfig>);
    vi.mocked(useToast).mockReturnValue({showToast: vi.fn()} as unknown as ReturnType<typeof useToast>);
  });

  it('puts the layout in the metadata and keeps the rest of the application', async () => {
    const {result} = renderHook(() => useSaveMyAccountLayout());

    result.current.mutate({application, layout});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://localhost:8090/applications/app-1',
        method: 'PUT',
        data: {
          id: 'app-1',
          name: 'My Account',
          url: 'https://localhost:8090/myaccount',
          metadata: {team: 'identity', myAccount: layout},
        },
      }),
    );
  });

  it('reports a failed save', async () => {
    request.mockRejectedValue(new Error('refused'));
    const {result} = renderHook(() => useSaveMyAccountLayout());

    result.current.mutate({application, layout});
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
