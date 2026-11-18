// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cn} from '@thunderid/utils';
import {Box, Button, Link, Stack, Typography} from '@wso2/oxygen-ui';
import {useState, type JSX, type MouseEvent, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import type {LayoutSidePanel} from '../../models/layout';
import resolveSidePanel, {SIDE_PANEL_BLOCK_ATTRIBUTE, type ResolvedSidePanelBlock} from '../../utils/resolveSidePanel';

export interface AuthSidePanelProps {
  /** The side panel as the layout configures it. Nothing renders when it is off or has no block to show. */
  panel: LayoutSidePanel | undefined | null;
  /**
   * For the Console's preview: called with a block's ID when it is clicked, instead of following its link.
   * Without it, the panel is the live one and its links open as usual.
   */
  onSelectBlock?: (blockId: string) => void;
  /** For the Console's preview: the block being edited, which is outlined. */
  selectedBlockId?: string | null;
}

function AppleMark(): JSX.Element {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.53 3.83c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.67.8-3.54 1.82-.78.9-1.45 2.34-1.27 3.71 1.34.1 2.72-.69 3.56-1.7zM12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.15-1.69 1.63-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.85-.03-3.04 2.48-4.5 2.6-4.56-1.43-2.09-3.63-2.33-4.39-2.38-2-.16-3.68 1.09-4.62 1.09z" />
    </svg>
  );
}

// Google Play's mark keeps its own colors, as the store requires.
function PlayMark(): JSX.Element {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#00d7fe" d="M3.6 1.8 13.4 12 3.6 22.2c-.4-.2-.6-.7-.6-1.2V3c0-.5.2-1 .6-1.2z" />
      <path fill="#00f076" d="M16.8 8.6 13.4 12 3.6 1.8c.3-.2.8-.2 1.2 0z" />
      <path fill="#ff3a44" d="m16.8 15.4-12 6.8c-.4.2-.9.2-1.2 0L13.4 12z" />
      <path fill="#ffd400" d="M20.4 10.7c.8.5.8 2.1 0 2.6l-3.6 2.1-3.4-3.4 3.4-3.4z" />
    </svg>
  );
}

interface StoreBadgeProps {
  label: string;
  mark: JSX.Element;
  name: string;
  url: string;
}

// The stores' badges are black in every theme and color scheme, as the stores' guidelines ask.
function StoreBadge({label, mark, name, url}: StoreBadgeProps): JSX.Element {
  return (
    <Box
      component="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('SignInSidePanel--storeBadge')}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        minHeight: 52,
        pl: 1.75,
        pr: 2.25,
        py: 0.75,
        borderRadius: 1.25,
        border: '1px solid #a6a6a6',
        bgcolor: '#000000',
        color: '#ffffff',
        textDecoration: 'none',
        transition: 'transform 0.2s ease',
        '&:hover': {transform: 'translateY(-1px)'},
        '&:focus-visible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 3},
      }}
    >
      {mark}
      <Stack component="span" sx={{lineHeight: 1.1}}>
        <Box component="span" sx={{fontSize: '0.7rem', letterSpacing: '0.02em'}}>
          {label}
        </Box>
        <Box component="span" sx={{fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em'}}>
          {name}
        </Box>
      </Stack>
    </Box>
  );
}

const isStore = (block: ResolvedSidePanelBlock): boolean => block.type === 'appStore' || block.type === 'googlePlay';

/**
 * The panel beside the sign-in form, built from the layout's blocks in order: labels, headlines in the
 * theme's primary color, text with an optional link, pictures, buttons and app store badges. Store badges
 * next to each other share a row. The Gate and the Console's preview both render it, so the preview
 * matches the sign-in page.
 */
export default function AuthSidePanel({
  panel,
  onSelectBlock = undefined,
  selectedBlockId = null,
}: AuthSidePanelProps): JSX.Element | null {
  const {t} = useTranslation();
  // Pictures that failed to load, by address: the live page leaves them out rather than keep an empty box.
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(new Set());
  const resolved = resolveSidePanel(panel);

  if (!resolved) return null;

  // In the preview, a block is a target to select: a click picks it for editing instead of following a link.
  const selectable = (block: ResolvedSidePanelBlock, content: ReactNode): JSX.Element => {
    if (!onSelectBlock) return <Box key={block.id}>{content}</Box>;

    const selected = block.id === selectedBlockId;
    return (
      <Box
        key={block.id}
        {...{[SIDE_PANEL_BLOCK_ATTRIBUTE]: block.id}}
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          onSelectBlock(block.id);
        }}
        sx={{
          cursor: 'pointer',
          borderRadius: 1,
          outline: '2px dashed',
          outlineColor: selected ? 'primary.main' : 'transparent',
          outlineOffset: 6,
          '&:hover': {outlineColor: selected ? 'primary.main' : 'divider'},
        }}
      >
        {content}
      </Box>
    );
  };

  const storeBadge = (block: ResolvedSidePanelBlock): JSX.Element =>
    block.type === 'appStore' ? (
      <StoreBadge
        url={block.url!}
        mark={<AppleMark />}
        label={t('signin:sidePanel.appStore.label', 'Download on the')}
        name={t('signin:sidePanel.appStore.name', 'App Store')}
      />
    ) : (
      <StoreBadge
        url={block.url!}
        mark={<PlayMark />}
        label={t('signin:sidePanel.googlePlay.label', 'Get it on')}
        name={t('signin:sidePanel.googlePlay.name', 'Google Play')}
      />
    );

  const renderBlock = (block: ResolvedSidePanelBlock): ReactNode => {
    switch (block.type) {
      case 'label':
        return (
          <Typography
            variant="overline"
            color="primary"
            className={cn('SignInSidePanel--label')}
            sx={{display: 'block', fontWeight: 700, letterSpacing: '0.14em', lineHeight: 1.4}}
          >
            {block.text}
          </Typography>
        );
      case 'heading':
        return (
          <Typography
            variant="h2"
            component="p"
            color="primary"
            className={cn('SignInSidePanel--heading')}
            sx={{
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              fontSize: {xs: '2rem', md: '2.5rem', lg: '3.25rem'},
              textWrap: 'balance',
              overflowWrap: 'anywhere',
            }}
          >
            {block.text}
          </Typography>
        );
      case 'text':
        return (
          <Typography
            variant="body1"
            className={cn('SignInSidePanel--text')}
            sx={{fontSize: {md: '1.1rem'}, lineHeight: 1.6, whiteSpace: 'pre-line'}}
          >
            {block.text}
            {block.text && block.link ? ' ' : null}
            {block.link && (
              <Link href={block.link.url} target="_blank" rel="noopener noreferrer" color="inherit" underline="always">
                {block.link.text}
              </Link>
            )}
          </Typography>
        );
      case 'image':
        if (failedImages.has(block.url!)) {
          // The preview keeps a placeholder to click and fix; the live page shows nothing.
          return onSelectBlock ? (
            <Box
              className={cn('SignInSidePanel--imageUnavailable')}
              sx={{
                p: 3,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 4,
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2">
                {t('signin:sidePanel.imageUnavailable', "This picture can't load here.")}
              </Typography>
            </Box>
          ) : null;
        }
        return (
          <Box
            component="img"
            src={block.url}
            alt={block.text}
            onError={() => setFailedImages((previous) => new Set(previous).add(block.url!))}
            className={cn('SignInSidePanel--image')}
            sx={{
              display: 'block',
              width: '100%',
              aspectRatio: '4 / 3',
              maxHeight: '42vh',
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
        );
      case 'button':
        return (
          <Button
            component="a"
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="large"
            className={cn('SignInSidePanel--button')}
          >
            {block.text}
          </Button>
        );
      default:
        return null;
    }
  };

  // Store badges next to each other share one row.
  const rows: ResolvedSidePanelBlock[][] = [];
  resolved.blocks.forEach((block) => {
    const last = rows[rows.length - 1];
    if (isStore(block) && last && isStore(last[0])) last.push(block);
    else rows.push([block]);
  });

  return (
    <Stack
      component="section"
      className={cn('SignInSidePanel--root')}
      sx={{
        display: {xs: resolved.showOnSmallScreens ? 'flex' : 'none', md: 'flex'},
        width: '100%',
        maxWidth: {md: 440, lg: 560},
        justifyContent: 'center',
        gap: 3,
      }}
    >
      {rows.map((row) =>
        isStore(row[0]) ? (
          <Stack
            key={row[0].id}
            component="ul"
            direction="row"
            aria-label={t('signin:sidePanel.stores', 'Get the app')}
            className={cn('SignInSidePanel--stores')}
            sx={{flexWrap: 'wrap', gap: 1.5, m: 0, p: 0, listStyle: 'none'}}
          >
            {row.map((block) => (
              <li key={block.id}>{selectable(block, storeBadge(block))}</li>
            ))}
          </Stack>
        ) : (
          selectable(row[0], renderBlock(row[0]))
        ),
      )}
    </Stack>
  );
}
