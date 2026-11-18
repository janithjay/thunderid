// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import PreviewOverlay from '../PreviewOverlay';

const LABELS: Record<string, string> = {'tab:security': 'Tab: Security', 'section:passkeys': '<Passkeys />'};

// A page with a tab in the menu and two components, one with a link in it, marked as the preview marks them.
const renderPage = (
  onSelect = vi.fn(),
  selection: {sectionId?: string; tabId: string} = {tabId: 'security'},
  onDrop = vi.fn(),
  editable = true,
) => {
  render(
    <>
      <div className="preview-region" data-preview-kind="tab" data-preview-id="security">
        <button type="button">Security</button>
      </div>
      <div className="preview-region" data-preview-kind="section" data-preview-id="passkeys">
        <a href="https://example.com/passkeys">Manage passkeys</a>
      </div>
      <div className="preview-region" data-preview-kind="section" data-preview-id="password">
        <div>Change password</div>
      </div>
      <PreviewOverlay
        accent="#ff7300"
        editable={editable}
        hidden={['section:password']}
        hiddenLabel="Hidden"
        labels={LABELS}
        selection={selection}
        tabId="security"
        onDrop={onDrop}
        onSelect={onSelect}
      />
    </>,
  );
  return onSelect;
};

// Lays a component out as a 100px tall row, top first, since the test page has no layout of its own.
const placeAt = (text: string, top: number): void => {
  vi.spyOn(screen.getByText(text), 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({x: 0, y: top, width: 400, height: 100}),
  );
};

// Presses a component, moves the pointer to (x, y) and lets go there.
const dragTo = (element: HTMLElement, y: number): void => {
  fireEvent.pointerDown(element, {button: 0, clientX: 10, clientY: 10});
  fireEvent.pointerMove(document, {clientX: 10, clientY: y});
  fireEvent.pointerUp(document, {clientX: 10, clientY: y});
};

describe('PreviewOverlay', () => {
  beforeEach(() => {
    // As a browser's does, it reports each observed element once when it starts observing it.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly callback: () => void;
        constructor(callback: () => void) {
          this.callback = callback;
        }
        disconnect = vi.fn();
        observe(): void {
          this.callback();
        }
      },
    );
    vi.stubGlobal('CSS', {escape: (value: string) => value});
    // jsdom has no PointerEvent, so pointer events are mouse events with a pointer type.
    vi.stubGlobal('PointerEvent', MouseEvent);
  });

  it('names the selected tab', () => {
    renderPage();

    expect(screen.getByText('Tab: Security')).toBeInTheDocument();
    expect(screen.queryByText('<Passkeys />')).not.toBeInTheDocument();
  });

  it('marks a hidden component', () => {
    renderPage();

    expect(screen.getByText('Hidden')).toHaveClass('preview-hidden-mark');
  });

  it('names the component under the pointer as code', () => {
    renderPage();

    fireEvent.mouseMove(screen.getByText('Manage passkeys'));

    expect(screen.getByText('<Passkeys />')).toBeInTheDocument();
  });

  it('selects what is clicked instead of acting on the page', () => {
    const onSelect = renderPage();

    const opened: boolean = fireEvent.click(screen.getByText('Manage passkeys'));
    expect(opened).toBe(false);
    expect(onSelect).toHaveBeenLastCalledWith({tabId: 'security', sectionId: 'passkeys'});

    fireEvent.click(screen.getByText('Security'));
    expect(onSelect).toHaveBeenLastCalledWith({tabId: 'security'});
  });

  it('moves a dragged component before the one it is dropped on', () => {
    const onDrop = vi.fn();
    renderPage(vi.fn(), {tabId: 'security'}, onDrop);
    placeAt('Manage passkeys', 0);
    placeAt('Change password', 120);

    dragTo(screen.getByText('Change password'), 20);

    expect(onDrop).toHaveBeenCalledWith({kind: 'section', id: 'password', beforeId: 'passkeys'});
  });

  it('moves a component dropped past the last one to the end, and does not select it', () => {
    const onDrop = vi.fn();
    const onSelect = renderPage(vi.fn(), {tabId: 'security'}, onDrop);
    placeAt('Manage passkeys', 0);
    placeAt('Change password', 120);

    const passkeys: HTMLElement = screen.getByText('Manage passkeys');
    dragTo(passkeys, 400);
    fireEvent.click(passkeys);

    expect(onDrop).toHaveBeenCalledWith({kind: 'section', id: 'passkeys', beforeId: null});
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not drag when the layout cannot be changed', () => {
    const onDrop = vi.fn();
    renderPage(vi.fn(), {tabId: 'security'}, onDrop, false);
    placeAt('Manage passkeys', 0);
    placeAt('Change password', 120);

    dragTo(screen.getByText('Change password'), 20);

    expect(onDrop).not.toHaveBeenCalled();
  });
});
