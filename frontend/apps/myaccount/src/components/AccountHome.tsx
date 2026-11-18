// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Button,
  Card,
  getMeSessions,
  getVerifiedAttributes,
  Typography,
  UserAvatar,
  useThunderID,
} from '@thunderid/react';
import type {TFunction} from 'i18next';
import {useEffect, useState, type ReactElement, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import AppLogo from './AppLogo';

// The SDK exports these functions but not their result types, so derive the types from them.
type SSOSessionListResponse = Awaited<ReturnType<typeof getMeSessions>>;
type SSOSession = SSOSessionListResponse['sessions'][number];
type User = Record<string, unknown> | null;

export type HomeTarget = 'personal' | 'security' | 'devices';

interface AccountHomeProps {
  onNavigate: (target: HomeTarget) => void;
}

// ─── Profile helpers ──────────────────────────────────────────────

// Profiles differ in how they name attributes, so read the first one that holds a value.
const pick = (user: User, keys: string[]): string | undefined =>
  keys
    .map((key: string): unknown => user?.[key])
    .find((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);

const GIVEN_NAME_KEYS: string[] = ['givenName', 'given_name', 'firstName', 'first_name'];
const FAMILY_NAME_KEYS: string[] = ['familyName', 'family_name', 'lastName', 'last_name'];
const EMAIL_KEYS: string[] = ['email', 'emailAddress', 'email_address'];
const PHONE_KEYS: string[] = ['mobileNumber', 'mobile', 'phoneNumber', 'phone_number', 'phone'];
const USERNAME_KEYS: string[] = ['username', 'preferred_username', 'userName'];

interface Profile {
  email?: string;
  emailVerified: boolean;
  fullName?: string;
  givenName?: string;
  phone?: string;
  phoneVerified: boolean;
  username?: string;
}

const readProfile = (user: User): Profile => {
  const givenName: string | undefined = pick(user, GIVEN_NAME_KEYS);
  const familyName: string | undefined = pick(user, FAMILY_NAME_KEYS);
  const verified: Record<string, unknown> =
    getVerifiedAttributes(user as Parameters<typeof getVerifiedAttributes>[0]) ?? {};
  const isVerified = (keys: string[]): boolean => keys.some((key: string): boolean => Boolean(verified[key]));

  return {
    email: pick(user, EMAIL_KEYS),
    emailVerified: isVerified(EMAIL_KEYS),
    fullName: [givenName, familyName].filter(Boolean).join(' ') || pick(user, ['name', 'displayName']),
    givenName,
    phone: pick(user, PHONE_KEYS),
    phoneVerified: isVerified(PHONE_KEYS),
    username: pick(user, USERNAME_KEYS),
  };
};

// ─── Session helpers ──────────────────────────────────────────────

const BROWSERS: [RegExp, string][] = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\b(?:OPR|Opera)\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\b(?:Firefox|FxiOS)\//, 'Firefox'],
  [/\b(?:Chrome|CriOS)\//, 'Chrome'],
  [/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
];

const OPERATING_SYSTEMS: [RegExp, string][] = [
  [/\bWindows\b/, 'Windows'],
  [/\b(?:iPhone|iPad|iPod)\b/, 'iOS'],
  [/\bAndroid\b/, 'Android'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bLinux\b/, 'Linux'],
];

const MOBILE_OS: string[] = ['iOS', 'Android'];

interface Device {
  browser?: string;
  os?: string;
}

const describeDevice = (userAgent?: string): Device => {
  const match = (patterns: [RegExp, string][]): string | undefined =>
    userAgent ? patterns.find(([pattern]: [RegExp, string]) => pattern.test(userAgent))?.[1] : undefined;

  return {browser: match(BROWSERS), os: match(OPERATING_SYSTEMS)};
};

const deviceLabel = (t: TFunction, {browser, os}: Device): string => {
  if (browser && os) return t('home.devices.browserOnOs', '{{browser}} on {{os}}', {browser, os});

  return browser ?? os ?? t('home.devices.unknown', 'Unknown device');
};

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

const relativeTime = (t: TFunction, language: string, iso?: string): string => {
  const time: number = iso ? Date.parse(iso) : Number.NaN;

  if (Number.isNaN(time)) return t('home.unknownTime', 'Unknown');

  const seconds: number = Math.round((time - Date.now()) / 1000);
  const format: Intl.RelativeTimeFormat = new Intl.RelativeTimeFormat(language, {numeric: 'auto'});
  const unit: [Intl.RelativeTimeFormatUnit, number] | undefined = RELATIVE_UNITS.find(
    ([, size]: [Intl.RelativeTimeFormatUnit, number]) => Math.abs(seconds) >= size,
  );

  return unit ? format.format(Math.round(seconds / unit[1]), unit[0]) : t('home.justNow', 'Just now');
};

const absoluteTime = (language: string, iso?: string): string | undefined => {
  const time: number = iso ? Date.parse(iso) : Number.NaN;

  return Number.isNaN(time)
    ? undefined
    : new Date(time).toLocaleString(language, {dateStyle: 'medium', timeStyle: 'short'});
};

interface ConnectedApp {
  id: string;
  lastActiveAt: string;
  logoUrl?: string;
  name: string;
}

// Every app the user signed in to, across all sessions, most recently used first.
const collectApps = (sessions: SSOSession[]): ConnectedApp[] => {
  const apps = new Map<string, ConnectedApp>();

  sessions.forEach((session: SSOSession) => {
    session.participants.forEach(({appId, appName, appLogoUrl, lastActiveAt}) => {
      const existing: ConnectedApp | undefined = apps.get(appId);

      if (!existing || Date.parse(lastActiveAt) > Date.parse(existing.lastActiveAt)) {
        apps.set(appId, {id: appId, lastActiveAt, logoUrl: appLogoUrl, name: appName ?? appId});
      }
    });
  });

  return [...apps.values()].sort(
    (a: ConnectedApp, b: ConnectedApp) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt),
  );
};

// ─── Data ─────────────────────────────────────────────────────────

interface Loadable<T> {
  data?: T;
  failed: boolean;
}

function useAccountActivity(): {passkeys: Loadable<number>; sessions: Loadable<SSOSession[]>} {
  const {baseUrl, http, instanceId} = useThunderID();
  const [sessions, setSessions] = useState<Loadable<SSOSession[]>>({failed: false});
  const [passkeys, setPasskeys] = useState<Loadable<number>>({failed: false});

  useEffect(() => {
    let active = true;

    getMeSessions({baseUrl, instanceId})
      .then((page: SSOSessionListResponse) => active && setSessions({data: page.sessions ?? [], failed: false}))
      .catch(() => active && setSessions({failed: true}));

    http
      .request({method: 'GET', url: `${baseUrl}/users/me/passkeys`})
      .then(
        (response: {data?: {passkeys?: unknown[]}}) =>
          active && setPasskeys({data: response.data?.passkeys?.length ?? 0, failed: false}),
      )
      .catch(() => active && setPasskeys({failed: true}));

    return (): void => {
      active = false;
    };
    // `http` is a new object on every render, so it is left out to fetch once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, instanceId]);

  return {passkeys, sessions};
}

// ─── Icons ────────────────────────────────────────────────────────

function Svg({children, size = 20}: {children: ReactNode; size?: number}): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const CheckIcon = (): ReactElement => (
  <Svg size={14}>
    <path d="M5 12l5 5L20 7" />
  </Svg>
);

const AlertIcon = (): ReactElement => (
  <Svg size={14}>
    <path d="M12 8v5" />
    <path d="M12 16.5v.01" />
  </Svg>
);

const ArrowIcon = (): ReactElement => (
  <Svg size={16}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
);

const LaptopIcon = (): ReactElement => (
  <Svg>
    <rect x="4" y="5" width="16" height="11" rx="1.5" />
    <path d="M2 19h20" />
  </Svg>
);

const PhoneIcon = (): ReactElement => (
  <Svg>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18.5h2" />
  </Svg>
);

const BuildingIcon = (): ReactElement => (
  <Svg size={14}>
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
  </Svg>
);

// Card illustrations: a tinted disc with a simple glyph, in the spirit of the Google Account cards.
// They draw only in `--color-primary`, so they follow the brand color.
function Illustration({children}: {children: ReactNode}): ReactElement {
  return (
    <span className="home-illustration" aria-hidden="true">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" className="home-illustration-disc" />
        {children}
      </svg>
    </span>
  );
}

const ProfileArt = (): ReactElement => (
  <Illustration>
    <rect x="15" y="18" width="34" height="28" rx="4" className="home-illustration-paper" />
    <circle cx="25" cy="29" r="4.5" className="home-illustration-ink" />
    <path d="M18.5 40c1.2-3.6 3.6-5.5 6.5-5.5s5.3 1.9 6.5 5.5" className="home-illustration-ink" />
    <path d="M35 27h9M35 32h9M35 37h6" className="home-illustration-line" />
  </Illustration>
);

const ShieldArt = ({ok}: {ok: boolean}): ReactElement => (
  <Illustration>
    <path d="M32 50s14-6 14-17V20l-14-5-14 5v13c0 11 14 17 14 17z" className="home-illustration-paper" />
    {ok ? (
      <path d="M25 32.5l5 5 9-10" className="home-illustration-line" />
    ) : (
      <path d="M32 24v10M32 40v.01" className="home-illustration-line" />
    )}
  </Illustration>
);

const DevicesArt = (): ReactElement => (
  <Illustration>
    <rect x="18.5" y="22" width="22.5" height="15" rx="2" className="home-illustration-paper" />
    <path d="M16 40h27" className="home-illustration-line" />
    <rect x="39" y="27" width="9" height="15" rx="2" className="home-illustration-paper" />
    <path d="M43 38.5h1.5" className="home-illustration-line" />
  </Illustration>
);

const AppsArt = (): ReactElement => (
  <Illustration>
    <rect x="17" y="17" width="12" height="12" rx="3" className="home-illustration-paper" />
    <rect x="35" y="17" width="12" height="12" rx="3" className="home-illustration-paper" />
    <rect x="17" y="35" width="12" height="12" rx="3" className="home-illustration-paper" />
    <circle cx="41" cy="41" r="6" className="home-illustration-ink" />
  </Illustration>
);

// ─── Building blocks ──────────────────────────────────────────────

interface CardProps {
  art: ReactNode;
  children: ReactNode;
  className?: string;
  footer: string;
  onFooter: () => void;
  summary: ReactNode;
  title: string;
}

// One overview card: the SDK's outlined card, with its title, summary and a link to the tab that manages it.
function HomeCard({art, children, className = '', footer, onFooter, summary, title}: CardProps): ReactElement {
  return (
    <Card variant="outlined" className={`home-card ${className}`.trim()}>
      <div>
        <div className="home-card-head">
          <div>
            <Typography variant="h6" component="h3" fontWeight="semibold">
              {title}
            </Typography>
            <Typography variant="body2" color="textSecondary" className="home-card-summary">
              {summary}
            </Typography>
          </div>
          {art}
        </div>
        {children}
      </div>
      <Button
        variant="text"
        color="primary"
        fullWidth
        endIcon={<ArrowIcon />}
        className="home-card-footer"
        onClick={onFooter}
      >
        {footer}
      </Button>
    </Card>
  );
}

function Pill({ok, children}: {ok: boolean; children: ReactNode}): ReactElement {
  return <span className={`home-pill home-pill--${ok ? 'ok' : 'warn'}`}>{children}</span>;
}

function Skeleton({rows = 2}: {rows?: number}): ReactElement {
  const {t} = useTranslation();

  return (
    <div className="home-skeleton" role="status" aria-label={t('home.loading', 'Loading')}>
      {Array.from({length: rows}, (_: unknown, index: number) => (
        <span key={index} className="home-skeleton-row" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

interface CheckupItem {
  // What fixes the tip: a button in the row, labelled with the verb.
  action?: {label: string; onClick: () => void};
  detail: string;
  label: string;
  ok: boolean;
}

// The Home tab: a Google Account-style overview of the signed-in user's profile, security, devices,
// and apps, each linking to the tab where it is managed.
export default function AccountHome({onNavigate}: AccountHomeProps): ReactElement {
  const {t, i18n} = useTranslation();
  const language: string = i18n.language;
  const context = useThunderID();
  const user: User = context.user as User;
  const {currentOrganizationUnit} = context;
  const {passkeys, sessions} = useAccountActivity();
  const profile: Profile = readProfile(user);

  const sessionList: SSOSession[] = sessions.data ?? [];
  const current: SSOSession | undefined = sessionList.find((session: SSOSession) => session.isCurrent);
  const otherSessions: number = sessionList.filter((session: SSOSession) => !session.isCurrent).length;
  const apps: ConnectedApp[] = collectApps(sessionList);

  const checkup: CheckupItem[] = [
    ...(passkeys.data !== undefined
      ? [
          {
            label: t('home.checkup.passkeys.label', 'Passkeys'),
            ok: passkeys.data > 0,
            detail:
              passkeys.data > 0
                ? t('home.checkup.passkeys.added', '{{count}} passkeys added', {count: passkeys.data})
                : t('home.checkup.passkeys.none', 'Add a passkey for faster, phishing-resistant sign-in'),
          },
        ]
      : []),
    ...(profile.email
      ? [
          {
            label: t('home.checkup.email.label', 'Recovery email'),
            ok: profile.emailVerified,
            detail: profile.emailVerified
              ? profile.email
              : t('home.checkup.email.unverified', '{{email}} is not verified', {email: profile.email}),
            action: profile.emailVerified
              ? undefined
              : // Email verification lives on the Personal info tab, next to the email itself.
                {label: t('home.checkup.verify', 'Verify'), onClick: () => onNavigate('personal')},
          },
        ]
      : [
          {
            label: t('home.checkup.email.label', 'Recovery email'),
            ok: false,
            detail: t('home.checkup.email.missing', 'Add an email to recover your account'),
            action: {label: t('home.checkup.add', 'Add'), onClick: () => onNavigate('personal')},
          },
        ]),
    ...(sessions.data
      ? [
          {
            label: t('home.checkup.devices.label', 'Other signed-in devices'),
            ok: otherSessions === 0,
            detail:
              otherSessions === 0
                ? t('home.checkup.devices.none', 'Only this device is signed in')
                : t('home.checkup.devices.some', 'Signed in on {{count}} other devices', {count: otherSessions}),
            action:
              otherSessions === 0
                ? undefined
                : {label: t('home.checkup.review', 'Review'), onClick: () => onNavigate('devices')},
          },
        ]
      : []),
  ];

  const tips: number = checkup.filter((item: CheckupItem) => !item.ok).length;
  const name: string | undefined = profile.fullName ?? profile.username;
  const currentDevice: Device | undefined = current ? describeDevice(current.userAgent) : undefined;
  const signedInAt: string | undefined = absoluteTime(language, current?.authenticatedAt);
  const signedInWith: string | undefined =
    currentDevice?.browser || currentDevice?.os ? deviceLabel(t, currentDevice) : undefined;

  return (
    <div className="home">
      <header className="home-hero">
        <div className="home-hero-avatar">
          <UserAvatar size={88} />
        </div>
        <Typography variant="h3" component="h2" fontWeight="semibold" align="center">
          {name ? t('home.greeting', 'Welcome, {{name}}', {name}) : t('home.greetingAnonymous', 'Welcome')}
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" className="home-hero-subtitle">
          {t('home.subtitle', 'Manage your info and security to make your account work better for you.')}
        </Typography>
        <div className="home-hero-meta">
          {profile.email && <span className="home-chip">{profile.email}</span>}
          {currentOrganizationUnit?.name && (
            <span className="home-chip">
              <BuildingIcon />
              {currentOrganizationUnit.name}
            </span>
          )}
        </div>
      </header>

      <div className="home-grid">
        <HomeCard
          title={t('home.personal.title', 'Personal info')}
          summary={t('home.personal.summary', 'Your basic info, like your name and how people reach you.')}
          art={<ProfileArt />}
          footer={t('home.personal.footer', 'Manage your personal info')}
          onFooter={() => onNavigate('personal')}
        >
          <dl className="home-fields">
            <div className="home-field">
              <dt>{t('home.field.name', 'Name')}</dt>
              <dd>{profile.fullName ?? <span className="home-muted">{t('home.notSet', 'Not set')}</span>}</dd>
            </div>
            {profile.username && (
              <div className="home-field">
                <dt>{t('home.field.username', 'Username')}</dt>
                <dd>{profile.username}</dd>
              </div>
            )}
            <div className="home-field">
              <dt>{t('home.field.email', 'Email')}</dt>
              <dd>
                {profile.email ? (
                  <>
                    <span className="home-truncate">{profile.email}</span>
                    <Pill ok={profile.emailVerified}>
                      {profile.emailVerified ? t('home.verified', 'Verified') : t('home.unverified', 'Unverified')}
                    </Pill>
                  </>
                ) : (
                  <span className="home-muted">{t('home.notSet', 'Not set')}</span>
                )}
              </dd>
            </div>
            <div className="home-field">
              <dt>{t('home.field.phone', 'Phone')}</dt>
              <dd>
                {profile.phone ? (
                  <>
                    <span className="home-truncate">{profile.phone}</span>
                    {profile.phoneVerified && <Pill ok>{t('home.verified', 'Verified')}</Pill>}
                  </>
                ) : (
                  <span className="home-muted">{t('home.notSet', 'Not set')}</span>
                )}
              </dd>
            </div>
          </dl>
        </HomeCard>

        <HomeCard
          title={
            tips === 0
              ? t('home.security.protected', 'Your account is protected')
              : t('home.security.tips', 'You have {{count}} security tips', {count: tips})
          }
          summary={
            tips === 0
              ? t('home.security.protectedSummary', 'The security checkup found no recommended actions.')
              : t('home.security.tipsSummary', 'Act on these recommendations to keep your account safe.')
          }
          art={<ShieldArt ok={tips === 0} />}
          footer={t('home.security.footer', 'Review security')}
          onFooter={() => onNavigate('security')}
        >
          <ul className="home-checkup">
            {checkup.map((item: CheckupItem) => (
              <li key={item.label} className="home-checkup-item">
                <span className={`home-checkup-icon home-checkup-icon--${item.ok ? 'ok' : 'warn'}`}>
                  {item.ok ? <CheckIcon /> : <AlertIcon />}
                </span>
                <span className="home-checkup-text">
                  <span className="home-checkup-label">{item.label}</span>
                  <span className="home-checkup-detail">{item.detail}</span>
                </span>
                {item.action && (
                  <Button variant="outline" color="primary" size="small" onClick={item.action.onClick}>
                    {item.action.label}
                  </Button>
                )}
              </li>
            ))}
            {(sessions.data === undefined || passkeys.data === undefined) && !sessions.failed && !passkeys.failed && (
              <Skeleton rows={1} />
            )}
          </ul>
        </HomeCard>

        <HomeCard
          title={t('home.devices.title', 'Your devices')}
          summary={
            sessions.data
              ? t('home.devices.summary', "You're signed in on {{count}} devices.", {count: sessionList.length})
              : t('home.devices.summaryLoading', 'Where you are signed in.')
          }
          art={<DevicesArt />}
          footer={t('home.devices.footer', 'Manage all devices')}
          onFooter={() => onNavigate('devices')}
        >
          {sessions.failed && (
            <p className="home-muted">{t('home.devices.error', 'Your devices could not be loaded.')}</p>
          )}
          {!sessions.failed && !sessions.data && <Skeleton rows={3} />}
          {sessions.data && (
            <ul className="home-list">
              {[...sessionList]
                .sort((a: SSOSession, b: SSOSession) => Number(b.isCurrent) - Number(a.isCurrent))
                .slice(0, 3)
                .map((session: SSOSession) => {
                  const device: Device = describeDevice(session.userAgent);

                  return (
                    <li key={session.id} className="home-list-item">
                      <span className="home-list-icon">
                        {device.os && MOBILE_OS.includes(device.os) ? <PhoneIcon /> : <LaptopIcon />}
                      </span>
                      <span className="home-list-text">
                        <span className="home-list-title">{deviceLabel(t, device)}</span>
                        <span className="home-list-detail">
                          {session.isCurrent
                            ? t('home.devices.activeNow', 'Active now')
                            : t('home.devices.lastActive', 'Last active {{time}}', {
                                time: relativeTime(t, language, session.lastActiveAt),
                              })}
                          {session.lastActiveIp ? ` · ${session.lastActiveIp}` : ''}
                        </span>
                      </span>
                      {session.isCurrent && (
                        <span className="home-badge">{t('home.devices.thisDevice', 'This device')}</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </HomeCard>

        <HomeCard
          title={t('home.apps.title', 'Apps you use')}
          summary={t('home.apps.summary', 'Apps you signed in to with this account.')}
          art={<AppsArt />}
          footer={t('home.apps.footer', 'Review sign-ins')}
          onFooter={() => onNavigate('devices')}
        >
          {sessions.failed && <p className="home-muted">{t('home.apps.error', 'Your apps could not be loaded.')}</p>}
          {!sessions.failed && !sessions.data && <Skeleton rows={3} />}
          {sessions.data && apps.length === 0 && <p className="home-muted">{t('home.apps.empty', 'No apps yet.')}</p>}
          {sessions.data && apps.length > 0 && (
            <ul className="home-list">
              {apps.slice(0, 4).map((app: ConnectedApp) => (
                <li key={app.id} className="home-list-item">
                  <AppLogo name={app.name} url={app.logoUrl} />
                  <span className="home-list-text">
                    <span className="home-list-title">{app.name}</span>
                    <span className="home-list-detail">
                      {t('home.apps.lastUsed', 'Last used {{time}}', {
                        time: relativeTime(t, language, app.lastActiveAt),
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </HomeCard>
      </div>

      {current && (signedInAt ?? signedInWith) && (
        <p className="home-footnote">
          {signedInAt && signedInWith
            ? t('home.footnote.dateDevice', 'Signed in on {{date}} with {{device}}.', {
                date: signedInAt,
                device: signedInWith,
              })
            : signedInAt
              ? t('home.footnote.date', 'Signed in on {{date}}.', {date: signedInAt})
              : t('home.footnote.device', 'Signed in with {{device}}.', {device: signedInWith})}
        </p>
      )}
    </div>
  );
}
