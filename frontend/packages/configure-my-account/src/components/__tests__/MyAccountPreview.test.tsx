// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import userEvent from '@testing-library/user-event';
import type {Theme} from '@thunderid/design';
import {render, screen, waitFor, within} from '@thunderid/test-utils';
import {useEffect, useRef, type JSX} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {DEFAULT_TABS} from '../../constants/catalog';
import {PREVIEW_MESSAGE_SOURCE, type PreviewSelection} from '../../utils/previewState';
import MyAccountPreview, {type PreviewChange} from '../MyAccountPreview';

// The design preview frame, as a plain frame whose window is handed over as the real one's is.
vi.mock('@thunderid/configure-design', () => ({
  GatePreview: ({onPageWindow}: {onPageWindow: (frame: Window) => void}): JSX.Element => {
    const ref = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
      if (ref.current?.contentWindow) onPageWindow(ref.current.contentWindow);
    }, [onPageWindow]);
    return <iframe ref={ref} title="preview" />;
  },
}));

const frameWindow = (container: HTMLElement): Window => container.querySelector('iframe')!.contentWindow!;

const fromFrame = (source: Window, data: unknown, origin: string = window.location.origin): void => {
  window.dispatchEvent(new MessageEvent('message', {data, origin, source}));
};

interface PreviewProps {
  onAddTab?: (name: string, icon: string) => void;
  onChange?: (change: PreviewChange) => void;
  onSelect?: (selection: PreviewSelection) => void;
  theme?: Theme | null;
}

function Preview({
  onAddTab = vi.fn(),
  onChange = vi.fn(),
  onSelect = vi.fn(),
  theme = undefined,
}: PreviewProps): JSX.Element {
  return (
    <MyAccountPreview
      editable
      onAddTab={onAddTab}
      onRestoreTab={vi.fn()}
      onChange={onChange}
      pageUrl="/console/myaccount-preview.html"
      application={{name: 'Acme Account'}}
      theme={theme}
      tabs={DEFAULT_TABS}
      text={{'en-US': {'tabs.home': 'Overview'}}}
      language="en-US"
      selection={{tabId: 'home'}}
      onSelect={onSelect}
      toolbarPortal={null}
    />
  );
}

describe('MyAccountPreview', () => {
  it('sends the draft once the preview is ready, to the frame on this origin only', async () => {
    const {container} = render(<Preview />);
    const frame: Window = frameWindow(container);
    const post = vi.spyOn(frame, 'postMessage');

    expect(post).not.toHaveBeenCalled();
    fromFrame(frame, {source: PREVIEW_MESSAGE_SOURCE, type: 'ready'});

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [message, origin] = post.mock.calls.at(-1) as [
      {
        state: {
          application: {name: string};
          editable: boolean;
          labels: Record<string, string>;
          text: Record<string, string>;
        };
      },
      string,
    ];
    expect(origin).toBe(window.location.origin);
    expect(message).toMatchObject({source: PREVIEW_MESSAGE_SOURCE, type: 'state'});
    expect(message.state.application.name).toBe('Acme Account');
    expect(message.state.text).toEqual({'tabs.home': 'Overview'});
    expect(message.state.labels['tab:home']).toBe('Menu item: Overview');
    expect(message.state.editable).toBe(true);
    expect(message.state.labels['section:passkeys']).toBe('<Passkeys />');
  });

  it("waits for the application's theme before sending anything", async () => {
    const {container} = render(<Preview theme={null} />);
    const frame: Window = frameWindow(container);
    const post = vi.spyOn(frame, 'postMessage');

    fromFrame(frame, {source: PREVIEW_MESSAGE_SOURCE, type: 'ready'});

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(post).not.toHaveBeenCalled();
  });

  it('selects what is clicked in the preview', async () => {
    const onSelect = vi.fn();
    const {container} = render(<Preview onSelect={onSelect} />);

    fromFrame(frameWindow(container), {
      source: PREVIEW_MESSAGE_SOURCE,
      type: 'select',
      selection: {tabId: 'security', sectionId: 'passkeys'},
    });

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({tabId: 'security', sectionId: 'passkeys'}));
  });

  it("opens the flow builder's menu of components beside the add space, and adds the one picked", async () => {
    const onChange = vi.fn();
    const {container} = render(<Preview onChange={onChange} />);

    fromFrame(frameWindow(container), {
      source: PREVIEW_MESSAGE_SOURCE,
      type: 'openAdd',
      tabId: 'security',
      anchor: {left: 10, top: 20, width: 200, height: 40},
    });

    const menu: HTMLElement = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item: HTMLElement) => item.textContent),
    ).toEqual(['Profile', 'Change credential', 'Passkeys', 'Signed-in devices', 'Custom widget']);
    await userEvent.click(within(menu).getByRole('menuitem', {name: 'Custom widget'}));

    expect(onChange).toHaveBeenCalledWith({type: 'add', tabId: 'security', component: 'widget'});
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it("opens the form that adds a menu item beside the button under the preview's menu", async () => {
    const user = userEvent.setup();
    const onAddTab = vi.fn();
    const {container} = render(<Preview onAddTab={onAddTab} />);

    fromFrame(frameWindow(container), {
      source: PREVIEW_MESSAGE_SOURCE,
      type: 'openAddTab',
      anchor: {left: 10, top: 300, width: 200, height: 40},
    });

    const form: HTMLElement = await screen.findByRole('form', {name: 'Add a new feature'});
    await user.type(within(form).getByRole('textbox', {name: /Name/}), 'Help');
    await user.click(within(form).getByRole('button', {name: 'Add feature'}));

    expect(onAddTab).toHaveBeenCalledWith('Help', {icon: 'info'});
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument());
  });

  it('passes on a tab or a component moved in the preview', async () => {
    const onChange = vi.fn();
    const {container} = render(<Preview onChange={onChange} />);
    const move = {source: PREVIEW_MESSAGE_SOURCE, type: 'moveTab', id: 'devices', beforeId: 'home'};

    fromFrame(frameWindow(container), move);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(move));
  });

  it('ignores messages from another window, another origin, or not from the preview', async () => {
    const onSelect = vi.fn();
    const {container} = render(<Preview onSelect={onSelect} />);
    const select = {source: PREVIEW_MESSAGE_SOURCE, type: 'select', selection: {tabId: 'security'}};

    fromFrame(window, select);
    fromFrame(frameWindow(container), select, 'https://evil.example.com');
    fromFrame(frameWindow(container), {...select, source: 'other'});

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
