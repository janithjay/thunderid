// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ReactElement} from 'react';
import type {PreviewAnchor} from './protocol';

interface PreviewAddSpaceProps {
  accent: string;
  /** Whether the space adds a menu item, under the menu, rather than a component at the end of a page. */
  compact?: boolean;
  label: string;
  /** Asks the editor to open its menu of components, or its form to add a menu item, beside the space. */
  onOpen: (anchor: PreviewAnchor) => void;
}

/**
 * The dashed space at the end of a page of the preview, as the flow builder has in each step. The menu of
 * components it opens is the editor's own, drawn over the preview where the space is, so it looks and works as
 * the flow builder's does. It is a control of the preview, so the overlay lets clicks on it through.
 */
export default function PreviewAddSpace({accent, compact = false, label, onOpen}: PreviewAddSpaceProps): ReactElement {
  return (
    <div className={compact ? 'preview-add preview-add--compact' : 'preview-add'} data-preview-control="">
      <button
        type="button"
        className="preview-add-button"
        style={{borderColor: accent, color: accent}}
        aria-haspopup="menu"
        onClick={(event) => {
          const {height, left, top, width} = event.currentTarget.getBoundingClientRect();
          onOpen({height, left, top, width});
        }}
      >
        <span aria-hidden="true">+</span> {label}
      </button>
    </div>
  );
}
