// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {useConfig} from '@thunderid/contexts';
import {useThunderID} from '@thunderid/react';
import MyAccountQueryKeys from '../constants/my-account-query-keys';
import type {MyAccountApplication} from '../models/my-account';

/**
 * Fetches the application My Account signs in with, whose metadata holds the My Account layout.
 *
 * @param applicationId - The application's ID. Nothing is fetched without one.
 * @returns TanStack Query result object containing the application
 * @public
 */
export default function useGetMyAccountApplication(
  applicationId: string | undefined,
): UseQueryResult<MyAccountApplication> {
  const {http} = useThunderID();
  const {getServerUrl} = useConfig();

  return useQuery<MyAccountApplication>({
    queryKey: [MyAccountQueryKeys.APPLICATION, applicationId],
    queryFn: async (): Promise<MyAccountApplication> => {
      const response: {data: MyAccountApplication} = await http.request({
        url: `${getServerUrl()}/applications/${encodeURIComponent(applicationId ?? '')}`,
        method: 'GET',
      } as unknown as Parameters<typeof http.request>[0]);
      return response.data;
    },
    enabled: Boolean(applicationId),
  });
}
