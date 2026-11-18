// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import userEvent from '@testing-library/user-event';
import type {LayoutSidePanel} from '@thunderid/design';
import {render, screen} from '@thunderid/test-utils';
import {useState, type JSX} from 'react';
import {beforeEach, describe, expect, it} from 'vitest';
import nextBlockId from '../../../utils/nextBlockId';
import SidePanelEditor from '../SidePanelEditor';

const state: {panel: LayoutSidePanel | undefined; selected: string | null} = {panel: undefined, selected: null};

function Harness({initial = undefined}: {initial?: LayoutSidePanel}): JSX.Element {
  const [panel, setPanel] = useState<LayoutSidePanel | undefined>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <SidePanelEditor
      panel={panel}
      onChange={(next) => {
        state.panel = next;
        setPanel(next);
      }}
      selectedBlockId={selected}
      onSelectBlock={(id) => {
        state.selected = id;
        setSelected(id);
      }}
    />
  );
}

describe('SidePanelEditor', () => {
  beforeEach(() => {
    state.panel = undefined;
    state.selected = null;
  });

  it('starts a new panel with a headline and some text', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('switch', {name: 'Show side panel'}));

    expect(state.panel).toEqual({
      enabled: true,
      blocks: [
        {id: 'heading-1', type: 'heading', text: 'Welcome back'},
        {id: 'text-1', type: 'text', text: 'Sign in to manage your account.'},
      ],
    });
  });

  it('adds a block at the end and selects it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{enabled: true, blocks: [{id: 'heading-1', type: 'heading', text: 'Hi'}]}} />);

    await user.click(screen.getByRole('button', {name: 'App Store'}));
    await user.type(screen.getByRole('textbox', {name: /App Store page/}), 'https://apps.apple.com/app/id1');

    expect(state.panel?.blocks).toEqual([
      {id: 'heading-1', type: 'heading', text: 'Hi'},
      {id: 'appStore-1', type: 'appStore', url: 'https://apps.apple.com/app/id1'},
    ]);
    expect(state.selected).toBe('appStore-1');
  });

  it('moves and removes blocks', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          enabled: true,
          blocks: [
            {id: 'heading-1', type: 'heading', text: 'Hi'},
            {id: 'text-1', type: 'text', text: 'Body'},
          ],
        }}
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Move Text up'}));
    expect(state.panel?.blocks?.map((block) => block.id)).toEqual(['text-1', 'heading-1']);

    await user.click(screen.getByRole('button', {name: 'Remove Headline'}));
    expect(state.panel?.blocks?.map((block) => block.id)).toEqual(['text-1']);
  });

  it('flags an address the sign-in page cannot use', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{enabled: true, blocks: [{id: 'image-1', type: 'image'}]}} />);

    await user.type(screen.getByRole('textbox', {name: /Picture address/}), 'photo.jpg');

    expect(screen.getByText(/or a path on the server/)).toBeInTheDocument();
  });

  it('gives each new block an ID not yet taken', () => {
    expect(
      nextBlockId(
        [
          {id: 'text-1', type: 'text'},
          {id: 'text-2', type: 'text'},
        ],
        'text',
      ),
    ).toBe('text-3');
  });
});
