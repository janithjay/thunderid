// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useQuery, type UseQueryResult} from '@tanstack/react-query';
import {useConfig, useProjectScope} from '@thunderid/contexts';
import {useThunderID} from '@thunderid/react';
import MyAccountQueryKeys from '../constants/my-account-query-keys';

/**
 * An application My Account can sign in with.
 *
 * @public
 */
export interface ApplicationOption {
  clientId?: string;
  id: string;
  name: string;
}

/**
 * Fetches the applications of the selected project, to find the one My Account signs in with.
 *
 * @returns TanStack Query result object containing the applications
 * @public
 */
export default function useGetProjectApplications(): UseQueryResult<ApplicationOption[]> {
  const {http} = useThunderID();
  const {getServerUrl} = useConfig();
  const {projectId} = useProjectScope();
  const params = new URLSearchParams({limit: '100'});
  if (projectId) {
    params.set('projectId', projectId);
  }

  return useQuery<ApplicationOption[]>({
    queryKey: [MyAccountQueryKeys.APPLICATIONS, {projectId}],
    queryFn: async (): Promise<ApplicationOption[]> => {
      const response: {data: {applications?: ApplicationOption[]}} = await http.request({
        url: `${getServerUrl()}/applications?${params.toString()}`,
        method: 'GET',
      } as unknown as Parameters<typeof http.request>[0]);
      return (response.data.applications ?? []).map(({clientId, id, name}: ApplicationOption) => ({
        clientId,
        id,
        name,
      }));
    },
  });
}
