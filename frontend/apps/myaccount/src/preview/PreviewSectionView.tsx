// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BaseActiveSessions, BaseChangeCredential, BasePasskeys, BaseUserProfile} from '@thunderid/react';
import type {ComponentProps, ReactElement} from 'react';
import {SAMPLE_PASSKEYS, SAMPLE_SESSIONS, SAMPLE_USER, SAMPLE_USER_SCHEMA} from './sampleData';
import CustomWidget from '../components/CustomWidget';
import type {AccountSection} from '../layout/accountLayout';

type Profile = ComponentProps<typeof BaseUserProfile>['profile'];
type UserSchema = ComponentProps<typeof BaseUserProfile>['userSchema'];

// The name ChangeCredential gives a credential the schema does not name: the attribute, title-cased.
const titleCase = (attribute: string): string => attribute.charAt(0).toUpperCase() + attribute.slice(1);

/**
 * One component of a tab, as AccountSectionView renders it, filled with sample data: the SDK's Base
 * component each SDK component renders, with the props it passes and the sample user's data.
 */
export default function PreviewSectionView({section}: {section: AccountSection}): ReactElement | null {
  switch (section.type) {
    case 'profile':
      return (
        <BaseUserProfile
          profile={SAMPLE_USER as Profile}
          flattenedProfile={SAMPLE_USER as Profile}
          userSchema={SAMPLE_USER_SCHEMA as UserSchema}
          editable
        />
      );
    case 'credential': {
      const attribute: string = section.attribute ?? 'password';
      return (
        <BaseChangeCredential
          cardLayout
          credentialDisplayName={SAMPLE_USER_SCHEMA[attribute]?.displayName ?? titleCase(attribute)}
        />
      );
    }
    case 'passkeys':
      return <BasePasskeys passkeys={SAMPLE_PASSKEYS} supported />;
    case 'sessions':
      return <BaseActiveSessions cardLayout sessions={SAMPLE_SESSIONS} totalResults={SAMPLE_SESSIONS.length} />;
    case 'widget':
      return <CustomWidget section={section} />;
    default:
      return null;
  }
}
