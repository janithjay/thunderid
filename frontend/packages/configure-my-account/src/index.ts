// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export {default as MyAccountPage} from './pages/MyAccountPage';
export {default as useGetMyAccountApplication} from './api/useGetMyAccountApplication';
export {default as useSaveMyAccountLayout} from './api/useSaveMyAccountLayout';
export type {SaveMyAccountLayoutVariables} from './api/useSaveMyAccountLayout';
export {default as MyAccountQueryKeys} from './constants/my-account-query-keys';
export {DEFAULT_TABS, SECTION_CATALOG} from './constants/catalog';
export type {SectionCatalogEntry} from './constants/catalog';
export {defaultMyAccountRoutePaths} from './hooks/useMyAccountRoutes';
export type {MyAccountRoutePaths} from './hooks/useMyAccountRoutes';
export {MY_ACCOUNT_METADATA_KEY} from './models/my-account';
export type * from './models/my-account';
