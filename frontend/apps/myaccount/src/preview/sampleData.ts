// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AccountActivity, SSOSession} from '../components/AccountHome';

// Sample data the preview shows in place of a signed-in user's own, shaped as the server returns it.

const NOW: number = Date.now();
const minutesAgo = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString();

/** A user of the default person type, with a verified email. */
export const SAMPLE_USER: Record<string, unknown> = {
  username: 'alex',
  email: 'alex@example.com',
  given_name: 'Alex',
  family_name: 'Morgan',
  mobile_number: '+15550100',
  verifiedAttributes: {email: {verifiedAt: minutesAgo(60 * 24 * 30)}},
};

/** The default person type's schema, as `GET /users/me/meta` returns it. */
export const SAMPLE_USER_SCHEMA: Record<string, {displayName: string; required?: boolean; type: string}> = {
  username: {type: 'string', displayName: 'Username', required: true},
  email: {type: 'email', displayName: 'Email', required: true},
  given_name: {type: 'string', displayName: 'First Name'},
  family_name: {type: 'string', displayName: 'Last Name'},
  mobile_number: {type: 'mobile', displayName: 'Mobile Number'},
};

export const SAMPLE_ORGANIZATION_UNIT = {id: 'sample-organization-unit', handle: 'default', name: 'Default'};

export const SAMPLE_PASSKEYS: {id: string; name?: string}[] = [{id: 'sample-passkey', name: 'MacBook Pro'}];

export const SAMPLE_SESSIONS: SSOSession[] = [
  {
    id: 'sample-session-current',
    isCurrent: true,
    userId: 'sample-user',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    authenticatedAt: minutesAgo(90),
    createdAt: minutesAgo(90),
    lastActiveAt: minutesAgo(0),
    lastActiveIp: '203.0.113.10',
    participants: [
      {appId: 'sample-store', appName: 'Store', firstJoinedAt: minutesAgo(90), lastActiveAt: minutesAgo(5)},
    ],
  },
  {
    id: 'sample-session-phone',
    isCurrent: false,
    userId: 'sample-user',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    authenticatedAt: minutesAgo(60 * 26),
    createdAt: minutesAgo(60 * 26),
    lastActiveAt: minutesAgo(60 * 25),
    lastActiveIp: '198.51.100.24',
    participants: [
      {appId: 'sample-store', appName: 'Store', firstJoinedAt: minutesAgo(60 * 26), lastActiveAt: minutesAgo(60 * 25)},
    ],
  },
] as SSOSession[];

export const SAMPLE_ACTIVITY: AccountActivity = {
  passkeys: {data: SAMPLE_PASSKEYS.length, failed: false},
  sessions: {data: SAMPLE_SESSIONS, failed: false},
};
