// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Card, Typography} from '@thunderid/react';
import {useState, type ReactElement} from 'react';
import {useTranslation} from 'react-i18next';
import {isRenderableBlock, type AccountSection, type WidgetBlock} from '../layout/accountLayout';

// An image the page cannot load, such as one the Console's preview may not fetch, keeps its place and says so.
function WidgetImage({alt, url}: {alt: string; url: string}): ReactElement {
  const {t} = useTranslation();
  const [failed, setFailed] = useState<boolean>(false);

  if (failed) {
    return (
      <div className="custom-widget-image custom-widget-image--missing" role="img" aria-label={alt}>
        {t('widget.imageUnavailable', 'Image unavailable')}
      </div>
    );
  }
  return (
    <img
      className="custom-widget-image"
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * A card a developer builds from blocks: headings, text, images and buttons that open a page. Its text is the
 * configuration's text for `sections.<section id>.<block id>`. My Account renders every block itself, so a widget
 * can show anything these blocks can, and never runs code of its own.
 */
export default function CustomWidget({section}: {section: AccountSection}): ReactElement {
  const {t} = useTranslation();
  const blocks: WidgetBlock[] = (section.blocks ?? []).filter(isRenderableBlock);
  const buttons: WidgetBlock[] = [];
  const content: ReactElement[] = [];
  const text = (block: WidgetBlock): string => t(`sections.${section.id}.${block.id}`, '');

  // Consecutive buttons sit on one row.
  const flushButtons = (): void => {
    if (buttons.length === 0) return;
    const row: WidgetBlock[] = buttons.splice(0);
    content.push(
      <div key={`buttons-${row[0].id}`} className="custom-widget-actions">
        {row.map((block: WidgetBlock, index: number) => (
          <a
            key={block.id}
            className={`custom-widget-button${index === 0 ? ' custom-widget-button--primary' : ''}`}
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {text(block) || t('widget.open', 'Open')}
          </a>
        ))}
      </div>,
    );
  };

  blocks.forEach((block: WidgetBlock) => {
    if (block.type === 'button') {
      buttons.push(block);
      return;
    }
    flushButtons();
    if (block.type === 'heading') {
      content.push(
        <Typography key={block.id} variant="h6" component="h3" fontWeight="semibold">
          {text(block)}
        </Typography>,
      );
    } else if (block.type === 'text') {
      content.push(
        <Typography key={block.id} variant="body2" color="textSecondary" className="custom-widget-text">
          {text(block)}
        </Typography>,
      );
    } else {
      content.push(<WidgetImage key={block.id} url={block.url ?? ''} alt={text(block)} />);
    }
  });
  flushButtons();

  return (
    <Card variant="outlined" className="custom-widget">
      {content}
    </Card>
  );
}
