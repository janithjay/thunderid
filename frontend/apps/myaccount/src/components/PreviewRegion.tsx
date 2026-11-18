// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useContext, type ReactNode} from 'react';
import PreviewContext from './previewContext';

/** What a region of the page is: a tab in the menu, or a component in a tab. */
export type PreviewRegionKind = 'tab' | 'section';

interface PreviewRegionProps {
  children: ReactNode;
  /** Whether the tab or component is hidden from users, so the preview dims it. */
  hidden?: boolean;
  id: string;
  kind: PreviewRegionKind;
}

/**
 * Marks a tab or a component so the Console's preview can name it on hover and select it on click. Outside
 * the preview it renders its children as they are; inside, it adds an element that takes no part in the
 * layout (`display: contents`), so the page is laid out the same either way.
 */
export default function PreviewRegion({children, hidden = false, id, kind}: PreviewRegionProps): ReactNode {
  const preview: boolean = useContext(PreviewContext);

  if (!preview) {
    return children;
  }

  return (
    <div
      className={hidden ? 'preview-region preview-region--hidden' : 'preview-region'}
      data-preview-kind={kind}
      data-preview-id={id}
    >
      {children}
    </div>
  );
}
