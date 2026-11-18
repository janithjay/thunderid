// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Box, Button, IconButton, Stack, TextField, Tooltip, Typography} from '@wso2/oxygen-ui';
import {
  ChevronDown,
  ChevronUp,
  Heading,
  Image,
  MousePointerClick,
  Plus,
  Trash2,
  Type,
} from '@wso2/oxygen-ui-icons-react';
import type {JSX} from 'react';
import {useTranslation} from 'react-i18next';
import {PanelField} from './PanelSection';
import {MAX_WIDGET_BLOCKS} from '../constants/catalog';
import type {
  MyAccountSection,
  MyAccountWidgetBlock,
  MyAccountWidgetBlockType,
  MyAccountText,
} from '../models/my-account';
import {HTTPS_URL_PATTERN, addBlock, moveBefore, removeSectionText, setText} from '../utils/layoutEditing';

interface BlockKind {
  icon: typeof Heading;
  /** The translation key of the block's name, and its English fallback. */
  name: [string, string];
  /** The label of the block's text field. */
  textLabel: [string, string];
}

const BLOCK_KINDS: Record<MyAccountWidgetBlockType, BlockKind> = {
  heading: {icon: Heading, name: ['widget.heading', 'Heading'], textLabel: ['widget.headingText', 'Heading']},
  text: {icon: Type, name: ['widget.text', 'Text'], textLabel: ['widget.textText', 'Text']},
  image: {icon: Image, name: ['widget.image', 'Image'], textLabel: ['widget.imageText', 'Description']},
  button: {icon: MousePointerClick, name: ['widget.button', 'Button'], textLabel: ['widget.buttonText', 'Label']},
};

const BLOCK_TYPES: MyAccountWidgetBlockType[] = ['heading', 'text', 'image', 'button'];

interface WidgetEditorProps {
  language: string;
  /** Changes the widget, and the layout's text with it. */
  onChange: (widget: MyAccountSection, text: MyAccountText) => void;
  readOnly: boolean;
  text: MyAccountText;
  widget: MyAccountSection;
}

/**
 * Builds a widget from blocks, in order: headings, text, images and buttons that open a page. Each block's text
 * is edited in the selected language; an image's or a button's address is the same in every language.
 */
export default function WidgetEditor({language, onChange, readOnly, text, widget}: WidgetEditorProps): JSX.Element {
  const {t} = useTranslation('myAccountConfig');
  const blocks: MyAccountWidgetBlock[] = widget.blocks ?? [];
  const textKey = (block: MyAccountWidgetBlock): string => `sections.${widget.id}.${block.id}`;

  const setBlocks = (next: MyAccountWidgetBlock[], nextText: MyAccountText = text): void =>
    onChange({...widget, blocks: next}, nextText);

  return (
    <Stack spacing={2}>
      {blocks.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('widget.empty', 'Add a block to show something in this widget.')}
        </Typography>
      )}

      {blocks.map((block: MyAccountWidgetBlock, index: number) => {
        const kind: BlockKind = BLOCK_KINDS[block.type];
        const Icon = kind.icon;
        const name: string = t(kind.name[0], kind.name[1]);
        const hasAddress: boolean = block.type === 'image' || block.type === 'button';
        const address: string = block.url ?? '';
        const move = (beforeId: string | null): void => setBlocks(moveBefore(blocks, block.id, beforeId));
        return (
          <Box key={block.id} sx={{border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5}}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 1.5}}>
              <Icon size={16} aria-hidden />
              <Typography variant="subtitle2" sx={{flex: 1}}>
                {name}
              </Typography>
              {!readOnly && (
                <>
                  <Tooltip title={t('widget.moveUp', 'Move up')}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t('widget.moveBlockUp', 'Move {{name}} up', {name})}
                        disabled={index === 0}
                        onClick={() => move(blocks[index - 1]?.id ?? null)}
                      >
                        <ChevronUp size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('widget.moveDown', 'Move down')}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={t('widget.moveBlockDown', 'Move {{name}} down', {name})}
                        disabled={index === blocks.length - 1}
                        onClick={() => move(blocks[index + 2]?.id ?? null)}
                      >
                        <ChevronDown size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('widget.removeBlock', 'Remove block')}>
                    <IconButton
                      size="small"
                      aria-label={t('widget.removeNamedBlock', 'Remove {{name}}', {name})}
                      onClick={() =>
                        setBlocks(
                          blocks.filter((item: MyAccountWidgetBlock) => item.id !== block.id),
                          removeSectionText(text, widget.id, block.id),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
            <Stack spacing={1.5}>
              {hasAddress && (
                <PanelField
                  id={`my-account-widget-${block.id}-url`}
                  label={
                    block.type === 'image'
                      ? t('widget.imageAddress', 'Image address')
                      : t('widget.buttonAddress', 'Opens')
                  }
                  helperText={
                    block.type === 'button'
                      ? t('widget.buttonAddressHint', 'The page opens in a new tab. It must start with https://.')
                      : t('widget.imageAddressHint', 'It must start with https://.')
                  }
                  error={address !== '' && !HTTPS_URL_PATTERN.test(address)}
                  required
                >
                  <TextField
                    id={`my-account-widget-${block.id}-url`}
                    size="small"
                    placeholder="https://"
                    value={address}
                    error={address !== '' && !HTTPS_URL_PATTERN.test(address)}
                    onChange={(event) =>
                      setBlocks(
                        blocks.map((item: MyAccountWidgetBlock) =>
                          item.id === block.id ? {...item, url: event.target.value.trim()} : item,
                        ),
                      )
                    }
                    slotProps={{input: {readOnly}, htmlInput: {maxLength: 2048}}}
                    fullWidth
                  />
                </PanelField>
              )}
              <PanelField id={`my-account-widget-${block.id}-text`} label={t(kind.textLabel[0], kind.textLabel[1])}>
                <TextField
                  id={`my-account-widget-${block.id}-text`}
                  size="small"
                  value={text[language]?.[textKey(block)] ?? ''}
                  onChange={(event) => onChange(widget, setText(text, language, textKey(block), event.target.value))}
                  slotProps={{input: {readOnly}, htmlInput: {maxLength: 500}}}
                  multiline={block.type === 'text'}
                  minRows={block.type === 'text' ? 3 : undefined}
                  fullWidth
                />
              </PanelField>
            </Stack>
          </Box>
        );
      })}

      {!readOnly && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {blocks.length >= MAX_WIDGET_BLOCKS
              ? t('widget.full', 'A widget can have at most 10 blocks.')
              : t('widget.addHint', 'Add a block at the end of the widget.')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {BLOCK_TYPES.map((type: MyAccountWidgetBlockType) => {
              const Icon = BLOCK_KINDS[type].icon;
              return (
                <Button
                  key={type}
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={14} />}
                  endIcon={<Icon size={14} aria-hidden />}
                  disabled={blocks.length >= MAX_WIDGET_BLOCKS}
                  onClick={() => {
                    const next: MyAccountSection = addBlock(widget, type);
                    onChange(next, text);
                  }}
                >
                  {t(BLOCK_KINDS[type].name[0], BLOCK_KINDS[type].name[1])}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
