// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {SidePanelBlock, SidePanelBlockType} from '@thunderid/design';

/** An ID for a new side panel block, such as `text-2`: its type and the first number not yet taken. */
export default function nextBlockId(blocks: SidePanelBlock[], type: SidePanelBlockType): string {
  const taken = new Set(blocks.map((block) => block.id));
  let n = 1;
  while (taken.has(`${type}-${n}`)) n += 1;
  return `${type}-${n}`;
}
