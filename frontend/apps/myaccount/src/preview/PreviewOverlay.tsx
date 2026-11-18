// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useEffect, useLayoutEffect, useRef, useState, type ReactElement} from 'react';
import type {PreviewSelection} from './protocol';
import type {PreviewRegionKind} from '../components/PreviewRegion';

interface Region {
  id: string;
  kind: PreviewRegionKind;
}

interface Box {
  height: number;
  left: number;
  top: number;
  width: number;
}

/** Where a dragged tab or component lands: before another of its kind, or at the end (null). */
export interface PreviewDrop {
  beforeId: string | null;
  id: string;
  kind: PreviewRegionKind;
}

interface Drag {
  /** The space the drop lands in, while the pointer is over the list. */
  drop: (PreviewDrop & {space: Box}) | null;
  region: Region;
  x: number;
  y: number;
}

interface PreviewOverlayProps {
  accent: string;
  /** Whether tabs and components can be dragged to a new place. */
  editable: boolean;
  /** The tabs and components hidden from users, as `tab:<id>` and `section:<id>`. */
  hidden: string[];
  /** The mark on a tab or component hidden from users. */
  hiddenLabel: string;
  labels: Record<string, string>;
  onDrop: (drop: PreviewDrop) => void;
  onSelect: (selection: PreviewSelection) => void;
  selection: PreviewSelection;
  /** The tab shown, which a selected component belongs to. */
  tabId: string;
}

// How far the pointer moves before a press becomes a drag rather than a click.
const DRAG_THRESHOLD = 5;
// The thickness of the space a drop lands in.
const SPACE = 8;

const regionOf = (target: EventTarget | null): Region | null => {
  const element: Element | null = target instanceof Element ? target.closest('[data-preview-kind]') : null;
  const kind = element?.getAttribute('data-preview-kind') as PreviewRegionKind | null;
  const id: string | null | undefined = element?.getAttribute('data-preview-id');
  return kind && id ? {kind, id} : null;
};

const isControl = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[data-preview-control]') !== null;

// A region's element takes no part in the layout (`display: contents`), so it is measured by its children.
const measure = (element: Element | null): Box | null => {
  const rects: DOMRect[] = Array.from(element?.children ?? []).map((child: Element) => child.getBoundingClientRect());
  if (rects.length === 0) return null;
  const left: number = Math.min(...rects.map((rect: DOMRect) => rect.left));
  const top: number = Math.min(...rects.map((rect: DOMRect) => rect.top));
  return {
    left,
    top,
    width: Math.max(...rects.map((rect: DOMRect) => rect.right)) - left,
    height: Math.max(...rects.map((rect: DOMRect) => rect.bottom)) - top,
  };
};

const boxOf = (region: Region | null): Box | null =>
  region
    ? measure(
        document.querySelector(`[data-preview-kind="${region.kind}"][data-preview-id="${CSS.escape(region.id)}"]`),
      )
    : null;

const sameRegion = (a: Region | null, b: Region | null): boolean => a?.kind === b?.kind && a?.id === b?.id;

const overlapsVertically = (a: Box, b: Box): boolean => a.top < b.top + b.height && b.top < a.top + a.height;

/**
 * Where a drag of a region lands with the pointer at (x, y): among the other regions of its kind, in reading
 * order, before the first one the pointer is not past. A list whose items sit side by side, as the Home cards
 * do, is read across each row; a list of one item per row, down.
 */
const dropAt = (region: Region, x: number, y: number): Drag['drop'] => {
  const others: {box: Box; id: string}[] = Array.from(
    document.querySelectorAll(`[data-preview-kind="${region.kind}"]`),
  ).flatMap((element: Element) => {
    const id: string | null = element.getAttribute('data-preview-id');
    const box: Box | null = measure(element);
    return id && id !== region.id && box ? [{id, box}] : [];
  });
  if (others.length === 0) return null;

  const rows: boolean = others.some(
    (item, index: number) => index > 0 && overlapsVertically(item.box, others[index - 1].box),
  );
  const past = ({box}: {box: Box}): boolean =>
    y > box.top + box.height || (y >= box.top && (rows ? x > box.left + box.width / 2 : y > box.top + box.height / 2));
  const index: number = others.findIndex((item) => !past(item));
  const before = index === -1 ? null : others[index];
  const after = index === -1 ? others[others.length - 1] : others[index - 1];

  let space: Box;
  if (before && after && overlapsVertically(before.box, after.box)) {
    // Between two items of one row: a space standing in the gap between them.
    const left: number = (after.box.left + after.box.width + before.box.left) / 2 - SPACE / 2;
    space = {left, top: before.box.top, width: SPACE, height: before.box.height};
  } else if (before) {
    space = {left: before.box.left, top: before.box.top - SPACE - 2, width: before.box.width, height: SPACE};
  } else {
    const last: Box = (after ?? others[others.length - 1]).box;
    space = {left: last.left, top: last.top + last.height + 2, width: last.width, height: SPACE};
  }
  return {kind: region.kind, id: region.id, beforeId: before?.id ?? null, space};
};

/**
 * Outlines the tab or component under the pointer and the selected one, and names them, as the Console's other
 * previews do. A click selects the region under it instead of acting on the page, so nothing in the preview
 * navigates or submits. When the layout can be changed, a tab or component is also dragged to a new place: a
 * dashed space shows where it lands, and dropping it there asks the editor to move it.
 */
export default function PreviewOverlay({
  accent,
  editable,
  hidden,
  hiddenLabel,
  labels,
  onDrop,
  onSelect,
  selection,
  tabId,
}: PreviewOverlayProps): ReactElement {
  const [hovered, setHovered] = useState<Region | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Bumped when the page scrolls or resizes, so the outlines are measured again.
  const [, setFrame] = useState<number>(0);
  const selected: Region = selection.sectionId
    ? {kind: 'section', id: selection.sectionId}
    : {kind: 'tab', id: selection.tabId};
  // The press that may become a drag, and whether the click that ends a drag should be ignored.
  const press = useRef<{region: Region; x: number; y: number} | null>(null);
  const dragging = useRef<Drag | null>(null);
  const swallowClick = useRef<boolean>(false);

  // The page is laid out again for a new draft: measure the outlines and marks on it once it is drawn.
  const hiddenKey: string = hidden.join(' ');
  useLayoutEffect(() => {
    const id: number = requestAnimationFrame(() => setFrame((frame: number) => frame + 1));
    return (): void => cancelAnimationFrame(id);
  }, [labels, hiddenKey]);

  useEffect(() => {
    document.body.classList.toggle('preview-editable', editable);
    document.body.classList.toggle('preview-dragging', drag !== null);
  }, [editable, drag]);

  useEffect(() => {
    const update = (next: Drag | null): void => {
      dragging.current = next;
      setDrag(next);
    };
    const onPointerDown = (event: PointerEvent): void => {
      const region: Region | null = regionOf(event.target);
      if (!editable || event.button !== 0 || isControl(event.target) || !region) return;
      // Keeps the press from selecting text or starting the browser's own drag of a link or an image.
      event.preventDefault();
      press.current = {region, x: event.clientX, y: event.clientY};
    };
    const onPointerMove = (event: PointerEvent): void => {
      const start = press.current;
      if (!start) return;
      if (!dragging.current && Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_THRESHOLD) return;
      update({
        region: start.region,
        x: event.clientX,
        y: event.clientY,
        drop: dropAt(start.region, event.clientX, event.clientY),
      });
    };
    const onPointerUp = (): void => {
      const finished: Drag | null = dragging.current;
      press.current = null;
      if (!finished) return;
      swallowClick.current = true;
      update(null);
      if (finished.drop) {
        const {beforeId, id, kind} = finished.drop;
        onDrop({beforeId, id, kind});
      }
    };
    const onCancel = (): void => {
      press.current = null;
      update(null);
    };
    const onMove = (event: MouseEvent): void => {
      const region: Region | null = regionOf(event.target);
      setHovered((current: Region | null) => (sameRegion(current, region) ? current : region));
    };
    const onLeave = (): void => setHovered(null);
    const onClick = (event: MouseEvent): void => {
      if (isControl(event.target) && !swallowClick.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (swallowClick.current) {
        swallowClick.current = false;
        return;
      }
      const region: Region | null = regionOf(event.target);
      if (region) {
        onSelect(region.kind === 'tab' ? {tabId: region.id} : {tabId, sectionId: region.id});
      }
    };
    const onSubmit = (event: Event): void => event.preventDefault();
    const remeasure = (): void => setFrame((frame: number) => frame + 1);
    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('scroll', remeasure, true);
    return (): void => {
      observer.disconnect();
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [editable, onDrop, onSelect, tabId]);

  const label = (region: Region): string => labels[`${region.kind}:${region.id}`] ?? region.id;

  const outline = (region: Region | null, active: boolean): ReactElement | null => {
    const box: Box | null = boxOf(region);
    if (!region || !box) return null;
    return (
      <div
        key={`${active ? 'selected' : 'hovered'}-${region.kind}-${region.id}`}
        className={`preview-outline${active ? ' preview-outline--selected' : ''}`}
        style={{
          left: box.left - 3,
          top: box.top - 3,
          width: box.width + 6,
          height: box.height + 6,
          borderColor: accent,
        }}
      >
        <span className="preview-outline-label" style={{background: accent}}>
          {label(region)}
        </span>
      </div>
    );
  };

  if (drag) {
    return (
      <div className="preview-overlay" aria-hidden="true">
        {outline(drag.region, false)}
        {drag.drop && (
          <div
            className="preview-drop-space"
            style={{
              ...drag.drop.space,
              borderColor: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
          />
        )}
        <span className="preview-drag-label" style={{left: drag.x, top: drag.y, background: accent}}>
          {label(drag.region)}
        </span>
      </div>
    );
  }

  // Each hidden tab and component is marked at its top right corner.
  const hiddenMarks: ReactElement[] = hidden.flatMap((key: string) => {
    const [kind, id] = key.split(':') as [PreviewRegionKind, string];
    const box: Box | null = boxOf({kind, id});
    if (!box) return [];
    return [
      <span
        key={`hidden-${key}`}
        className="preview-hidden-mark"
        style={{left: box.left + box.width - 6, top: box.top + 6}}
      >
        {hiddenLabel}
      </span>,
    ];
  });

  return (
    <div className="preview-overlay" aria-hidden="true">
      {hiddenMarks}
      {outline(selected, true)}
      {!sameRegion(hovered, selected) && outline(hovered, false)}
    </div>
  );
}
