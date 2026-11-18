// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useMutation, useQueryClient, type UseMutationResult} from '@tanstack/react-query';
import {useConfig, useToast} from '@thunderid/contexts';
import {useThunderID} from '@thunderid/react';
import {useTranslation} from 'react-i18next';
import MyAccountQueryKeys from '../constants/my-account-query-keys';
import {MY_ACCOUNT_METADATA_KEY, type MyAccountApplication, type MyAccountLayout} from '../models/my-account';

/**
 * What a save sends: the application as it was read, and the layout to put in its metadata.
 *
 * @public
 */
export interface SaveMyAccountLayoutVariables {
  application: MyAccountApplication;
  layout: MyAccountLayout;
}

/**
 * Saves the My Account layout into the application's metadata, through the application API, leaving the
 * application's other settings as they were read. A failure is left to the caller, which shows it beside the save
 * action.
 *
 * @returns TanStack Query mutation object for saving the layout
 * @public
 */
export default function useSaveMyAccountLayout(): UseMutationResult<
  MyAccountApplication,
  Error,
  SaveMyAccountLayoutVariables
> {
  const {http} = useThunderID();
  const {getServerUrl} = useConfig();
  const queryClient: ReturnType<typeof useQueryClient> = useQueryClient();
  const {t} = useTranslation('myAccountConfig');
  const {showToast} = useToast();

  return useMutation<MyAccountApplication, Error, SaveMyAccountLayoutVariables>({
    mutationFn: async ({application, layout}: SaveMyAccountLayoutVariables): Promise<MyAccountApplication> => {
      // The application API returns the certificate it was given, but does not take it back on an update.
      const {certificate, ...rest} = application;
      void certificate;
      const response: {data: MyAccountApplication} = await http.request({
        url: `${getServerUrl()}/applications/${encodeURIComponent(application.id)}`,
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        data: {...rest, metadata: {...application.metadata, [MY_ACCOUNT_METADATA_KEY]: layout}},
      } as unknown as Parameters<typeof http.request>[0]);
      return response.data;
    },
    onSuccess: (saved: MyAccountApplication) => {
      queryClient.setQueryData([MyAccountQueryKeys.APPLICATION, saved.id], saved);
      // The application's own pages read it under the application keys.
      queryClient.invalidateQueries({queryKey: ['application', saved.id]}).catch(() => {
        // Ignore invalidation errors
      });
      showToast(t('save.success', 'My Account saved'), 'success');
    },
  });
}
