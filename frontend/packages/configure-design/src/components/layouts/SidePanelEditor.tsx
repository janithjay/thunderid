// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CspOriginHint} from '@thunderid/components';
import {
  isSidePanelImageUrl,
  isSidePanelLinkUrl,
  MAX_SIDE_PANEL_BLOCKS,
  type LayoutSidePanel,
  type SidePanelBlock,
  type SidePanelBlockType,
} from '@thunderid/design';
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@wso2/oxygen-ui';
import {
  ChevronDown,
  ChevronUp,
  Heading,
  Image,
  MousePointerClick,
  Play,
  Plus,
  Smartphone,
  Tag,
  Trash2,
  Type,
} from '@wso2/oxygen-ui-icons-react';
import {useEffect, useRef, type JSX} from 'react';
import {useTranslation} from 'react-i18next';
import nextBlockId from '../../utils/nextBlockId';

export interface SidePanelEditorProps {
  /** The side panel as the layout draft holds it, if the layout has one. */
  panel?: LayoutSidePanel;
  onChange: (panel: LayoutSidePanel) => void;
  /** The block being edited, which the preview outlines. */
  selectedBlockId?: string | null;
  /** Selects a block, here or from the preview. */
  onSelectBlock?: (blockId: string | null) => void;
}

interface BlockKind {
  icon: typeof Heading;
  /** The translation key of the block's name, and its English fallback. */
  name: [string, string];
}

const BLOCK_KINDS: Record<SidePanelBlockType, BlockKind> = {
  label: {icon: Tag, name: ['layouts.config.side_panel.blocks.label', 'Label']},
  heading: {icon: Heading, name: ['layouts.config.side_panel.blocks.heading', 'Headline']},
  text: {icon: Type, name: ['layouts.config.side_panel.blocks.text', 'Text']},
  image: {icon: Image, name: ['layouts.config.side_panel.blocks.image', 'Picture']},
  button: {icon: MousePointerClick, name: ['layouts.config.side_panel.blocks.button', 'Button']},
  appStore: {icon: Smartphone, name: ['layouts.config.side_panel.blocks.app_store', 'App Store']},
  googlePlay: {icon: Play, name: ['layouts.config.side_panel.blocks.google_play', 'Google Play']},
};

const BLOCK_TYPES: SidePanelBlockType[] = ['label', 'heading', 'text', 'image', 'button', 'appStore', 'googlePlay'];

const INPUT_SX = {fontSize: '0.8rem'};
const URL_INPUT_SX = {fontSize: '0.8rem', fontFamily: 'monospace'};

/**
 * SidePanelEditor - Builds the panel the sign-in page shows beside its form from blocks, in order: labels,
 * headlines, text with an optional link, pictures, buttons and app store badges. A block selected here is
 * outlined in the preview, and a block clicked in the preview is selected here.
 */
export default function SidePanelEditor({
  panel = undefined,
  onChange,
  selectedBlockId = null,
  onSelectBlock = undefined,
}: SidePanelEditorProps): JSX.Element {
  const {t} = useTranslation('design');
  const value: LayoutSidePanel = panel ?? {};
  const enabled = value.enabled === true;
  const blocks: SidePanelBlock[] = value.blocks ?? [];
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Bring the block picked in the preview into view.
  useEffect(() => {
    if (selectedBlockId) cardRefs.current.get(selectedBlockId)?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }, [selectedBlockId]);

  const update = (patch: Partial<LayoutSidePanel>): void => onChange({...value, ...patch});
  const setBlocks = (next: SidePanelBlock[]): void => update({blocks: next});
  const patchBlock = (id: string, patch: Partial<SidePanelBlock>): void =>
    setBlocks(blocks.map((block) => (block.id === id ? {...block, ...patch} : block)));

  const addBlock = (type: SidePanelBlockType): void => {
    const block: SidePanelBlock = {id: nextBlockId(blocks, type), type};
    setBlocks([...blocks, block]);
    onSelectBlock?.(block.id);
  };

  const moveBlock = (index: number, direction: -1 | 1): void => {
    const next = [...blocks];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setBlocks(next);
  };

  const enable = (on: boolean): void => {
    // A panel turned on for the first time starts with a headline and some text to edit.
    if (on && blocks.length === 0) {
      update({
        enabled: true,
        blocks: [
          {id: 'heading-1', type: 'heading', text: t('layouts.config.side_panel.starter.heading', 'Welcome back')},
          {
            id: 'text-1',
            type: 'text',
            text: t('layouts.config.side_panel.starter.text', 'Sign in to manage your account.'),
          },
        ],
      });
      return;
    }
    update({enabled: on});
  };

  const textField = (block: SidePanelBlock, label: string, multiline = false): JSX.Element => (
    <TextField
      id={`side-panel-${block.id}-text`}
      labelPlacement="top"
      label={label}
      size="small"
      value={block.text ?? ''}
      onChange={(event) => patchBlock(block.id, {text: event.target.value})}
      multiline={multiline}
      minRows={multiline ? 3 : undefined}
      fullWidth
      slotProps={{input: {sx: INPUT_SX}, htmlInput: {maxLength: 500}}}
    />
  );

  const urlField = (block: SidePanelBlock, label: string, required: boolean): JSX.Element => {
    const url = block.url ?? '';
    const isImage = block.type === 'image';
    const valid = isImage ? isSidePanelImageUrl(url) : isSidePanelLinkUrl(url);
    const hasError = url !== '' && !valid;
    const errorText = isImage
      ? t(
          'layouts.config.side_panel.errors.image',
          'Use an address that starts with https://, or a path on the server such as /gate/assets/images/photo.jpg',
        )
      : t('layouts.config.side_panel.errors.https', 'Use an address that starts with https://');

    return (
      <Stack>
        <TextField
          id={`side-panel-${block.id}-url`}
          labelPlacement="top"
          label={label}
          size="small"
          placeholder="https://"
          value={url}
          onChange={(event) => patchBlock(block.id, {url: event.target.value.trim()})}
          error={hasError}
          helperText={hasError ? errorText : undefined}
          required={required}
          fullWidth
          slotProps={{input: {sx: URL_INPUT_SX}, htmlInput: {maxLength: 2048}}}
        />
        {isImage && !hasError && <CspOriginHint value={url} resourceType="image" />}
      </Stack>
    );
  };

  const fields = (block: SidePanelBlock): JSX.Element | null => {
    switch (block.type) {
      case 'label':
        return textField(block, t('layouts.config.side_panel.fields.text', 'Text'));
      case 'heading':
        return textField(block, t('layouts.config.side_panel.fields.headline', 'Headline'));
      case 'text':
        return (
          <>
            {textField(block, t('layouts.config.side_panel.fields.text', 'Text'), true)}
            <TextField
              id={`side-panel-${block.id}-link-text`}
              labelPlacement="top"
              label={t('layouts.config.side_panel.fields.link_text', 'Link at the end (optional)')}
              size="small"
              value={block.linkText ?? ''}
              onChange={(event) => patchBlock(block.id, {linkText: event.target.value})}
              fullWidth
              slotProps={{input: {sx: INPUT_SX}, htmlInput: {maxLength: 200}}}
            />
            {urlField(block, t('layouts.config.side_panel.fields.link_url', 'Link opens'), false)}
          </>
        );
      case 'image':
        return (
          <>
            {urlField(block, t('layouts.config.side_panel.fields.image_url', 'Picture address'), true)}
            {textField(block, t('layouts.config.side_panel.fields.image_alt', 'Description, for screen readers'))}
          </>
        );
      case 'button':
        return (
          <>
            {textField(block, t('layouts.config.side_panel.fields.button_label', 'Label'))}
            {urlField(block, t('layouts.config.side_panel.fields.button_url', 'Opens'), true)}
          </>
        );
      case 'appStore':
        return urlField(block, t('layouts.config.side_panel.fields.app_store', 'App Store page'), true);
      case 'googlePlay':
        return urlField(block, t('layouts.config.side_panel.fields.google_play', 'Google Play page'), true);
      default:
        return null;
    }
  };

  const switchRow = (id: string, label: string, checked: boolean, onToggle: (on: boolean) => void): JSX.Element => (
    <FormControlLabel
      control={
        <Switch
          id={id}
          size="small"
          checked={checked}
          onChange={(event) => onToggle((event.target as HTMLInputElement).checked)}
        />
      }
      label={
        <Typography variant="body2" sx={{fontSize: '0.8rem'}}>
          {label}
        </Typography>
      }
      sx={{ml: 0, justifyContent: 'space-between'}}
      labelPlacement="start"
    />
  );

  return (
    <Stack gap={1.5} sx={{p: 1.5}}>
      <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.75rem'}}>
        {t(
          'layouts.config.side_panel.description',
          'Show a message, pictures and app store links beside the sign-in form. Click a block in the preview to edit it.',
        )}
      </Typography>

      {switchRow(
        'side-panel-enabled',
        t('layouts.config.side_panel.fields.enabled', 'Show side panel'),
        enabled,
        enable,
      )}

      {enabled && (
        <>
          <TextField
            id="side-panel-position"
            select
            labelPlacement="top"
            label={t('layouts.config.side_panel.fields.position.label', 'Position')}
            size="small"
            value={value.position === 'right' ? 'right' : 'left'}
            onChange={(event) => update({position: event.target.value === 'right' ? 'right' : 'left'})}
            fullWidth
            slotProps={{input: {sx: INPUT_SX}}}
          >
            <MenuItem value="left">
              {t('layouts.config.side_panel.fields.position.options.left', 'Left of the form')}
            </MenuItem>
            <MenuItem value="right">
              {t('layouts.config.side_panel.fields.position.options.right', 'Right of the form')}
            </MenuItem>
          </TextField>

          {switchRow(
            'side-panel-small-screens',
            t('layouts.config.side_panel.fields.small_screens', 'Show on phones'),
            value.showOnSmallScreens === true,
            (on) => update({showOnSmallScreens: on}),
          )}

          {blocks.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{fontSize: '0.8rem'}}>
              {t('layouts.config.side_panel.empty', 'Add a block to show something in the panel.')}
            </Typography>
          )}

          {blocks.map((block, index) => {
            const kind = BLOCK_KINDS[block.type] ?? BLOCK_KINDS.text;
            const Icon = kind.icon;
            const name = t(kind.name[0], kind.name[1]);
            const selected = block.id === selectedBlockId;

            return (
              <Box
                key={block.id}
                ref={(element: HTMLDivElement | null) => {
                  if (element) cardRefs.current.set(block.id, element);
                  else cardRefs.current.delete(block.id);
                }}
                onFocusCapture={() => onSelectBlock?.(block.id)}
                onClick={() => onSelectBlock?.(block.id)}
                sx={{
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  p: 1.25,
                }}
              >
                <Stack direction="row" alignItems="center" gap={0.75} sx={{mb: 1}}>
                  <Icon size={14} aria-hidden />
                  <Typography variant="subtitle2" sx={{flex: 1, fontSize: '0.8rem'}}>
                    {name}
                  </Typography>
                  <Tooltip title={t('layouts.config.side_panel.actions.move_up', 'Move up')}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t('layouts.config.side_panel.actions.move_block_up', 'Move {{name}} up', {name})}
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                      >
                        <ChevronUp size={14} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('layouts.config.side_panel.actions.move_down', 'Move down')}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t('layouts.config.side_panel.actions.move_block_down', 'Move {{name}} down', {
                          name,
                        })}
                        disabled={index === blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                      >
                        <ChevronDown size={14} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('layouts.config.side_panel.actions.remove', 'Remove block')}>
                    <IconButton
                      size="small"
                      aria-label={t('layouts.config.side_panel.actions.remove_block', 'Remove {{name}}', {name})}
                      onClick={(event) => {
                        event.stopPropagation();
                        setBlocks(blocks.filter((item) => item.id !== block.id));
                        if (selected) onSelectBlock?.(null);
                      }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack gap={1.25}>{fields(block)}</Stack>
              </Box>
            );
          })}

          <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.75rem'}}>
            {blocks.length >= MAX_SIDE_PANEL_BLOCKS
              ? t('layouts.config.side_panel.full', 'The panel can have at most {{count}} blocks.', {
                  count: MAX_SIDE_PANEL_BLOCKS,
                })
              : t('layouts.config.side_panel.add_hint', 'Add a block at the end of the panel.')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75}>
            {BLOCK_TYPES.map((type) => {
              const Icon = BLOCK_KINDS[type].icon;
              return (
                <Button
                  key={type}
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={12} />}
                  endIcon={<Icon size={12} aria-hidden />}
                  disabled={blocks.length >= MAX_SIDE_PANEL_BLOCKS}
                  onClick={() => addBlock(type)}
                  sx={{textTransform: 'none', fontSize: '0.72rem'}}
                >
                  {t(BLOCK_KINDS[type].name[0], BLOCK_KINDS[type].name[1])}
                </Button>
              );
            })}
          </Stack>
        </>
      )}
    </Stack>
  );
}
