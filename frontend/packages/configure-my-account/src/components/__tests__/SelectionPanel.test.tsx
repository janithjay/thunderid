// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import userEvent from '@testing-library/user-event';
import {render, screen} from '@thunderid/test-utils';
import {useState, type JSX} from 'react';
import {beforeEach, describe, expect, it} from 'vitest';
import {DEFAULT_TABS} from '../../constants/catalog';
import type {MyAccountTab, MyAccountText} from '../../models/my-account';
import type {PreviewSelection} from '../../utils/previewState';
import SelectionPanel from '../SelectionPanel';

const HELP_TAB: MyAccountTab = {
  id: 'help',
  custom: true,
  icon: 'help',
  sections: [
    {
      id: 'support',
      type: 'widget',
      blocks: [
        {id: 'heading', type: 'heading'},
        {id: 'open', type: 'button', url: 'https://support.example.com'},
      ],
    },
  ],
};

// The layout and selection as the panel last changed them.
const state: {selection: PreviewSelection; tabs: MyAccountTab[]; text: MyAccountText} = {
  selection: {tabId: ''},
  tabs: [],
  text: {},
};

interface HarnessProps {
  readOnly?: boolean;
  selection: PreviewSelection;
}

/** The panel with the layout it edits, as the page holds it. */
function Harness({readOnly = false, selection: initial}: HarnessProps): JSX.Element {
  const [tabs, setTabs] = useState<MyAccountTab[]>(state.tabs);
  const [text, setText] = useState<MyAccountText>(state.text);
  const [selection, setSelection] = useState<PreviewSelection>(initial);
  const [language, setLanguage] = useState<string>('en-US');
  return (
    <SelectionPanel
      tabs={tabs}
      text={text}
      language={language}
      selection={selection}
      readOnly={readOnly}
      onLanguageChange={setLanguage}
      onSelect={(next: PreviewSelection) => {
        state.selection = next;
        setSelection(next);
      }}
      onChange={(nextTabs: MyAccountTab[], nextText: MyAccountText) => {
        state.tabs = nextTabs;
        state.text = nextText;
        setTabs(nextTabs);
        setText(nextText);
      }}
    />
  );
}

describe('SelectionPanel', () => {
  beforeEach(() => {
    state.tabs = [...DEFAULT_TABS, HELP_TAB];
    state.text = {};
    state.selection = {tabId: ''};
  });

  it('asks for a selection when nothing is selected', () => {
    render(<Harness selection={{tabId: 'missing'}} />);

    expect(screen.getByText('Select a menu item or a component in the preview.')).toBeInTheDocument();
  });

  it("shows a built-in tab's own text in its fields, and keeps only what is changed", async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'security'}} />);

    const name: HTMLElement = screen.getByRole('textbox', {name: /Name in the menu/});
    expect(name).toHaveValue('Security');
    expect(screen.getByRole('textbox', {name: 'Heading'})).toHaveValue('Security');
    await user.clear(name);
    await user.type(name, 'Sign-in');
    await user.type(screen.getByRole('textbox', {name: 'Introduction'}), ' Today.');

    expect(state.text['en-US']).toEqual({
      'tabs.security': 'Sign-in',
      'security.subtitle': 'Manage your password, passkeys and other credentials. Today.',
    });

    await user.clear(name);
    await user.type(name, 'Security');
    expect(state.text['en-US']).toEqual({
      'security.subtitle': 'Manage your password, passkeys and other credentials. Today.',
    });
  });

  it("edits Home's greeting and introduction, keeping the user's name in the greeting", async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'home'}} />);

    const heading: HTMLElement = screen.getByRole('textbox', {name: 'Heading'});
    expect(heading).toHaveValue('Welcome, {{name}}');
    expect(screen.getByText("{{name}} shows the user's name.")).toBeInTheDocument();
    await user.clear(heading);
    await user.type(heading, 'Hi {{{{name}}');
    await user.clear(screen.getByRole('textbox', {name: 'Introduction'}));
    await user.type(screen.getByRole('textbox', {name: 'Introduction'}), 'Your account.');

    expect(state.text['en-US']).toEqual({'home.greeting': 'Hi {{name}}', 'home.subtitle': 'Your account.'});
  });

  it('flags a name cleared on purpose', async () => {
    const user = userEvent.setup();
    state.text = {'en-US': {'tabs.help': 'Help'}};
    render(<Harness selection={{tabId: 'help'}} />);

    await user.clear(screen.getByRole('textbox', {name: /Name in the menu/}));

    expect(state.text['en-US']).toEqual({'tabs.help': ''});
    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
  });

  it('keeps the text of each language apart', async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'personal'}} />);

    await user.type(screen.getByRole('textbox', {name: 'Add a language'}), 'fr-FR');
    await user.click(screen.getByRole('button', {name: 'Add'}));
    expect(screen.getByRole('textbox', {name: /Name in the menu/})).toHaveValue('');
    await user.type(screen.getByRole('textbox', {name: /Name in the menu/}), 'Profil');

    expect(state.text).toEqual({'fr-FR': {'tabs.personal': 'Profil'}});
  });

  it('hides a menu item, and deletes a custom one', async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'help'}} />);

    await user.click(screen.getByRole('checkbox', {name: 'Hide'}));
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'help')?.hidden).toBe(true);

    await user.click(screen.getByRole('button', {name: 'Delete'}));
    expect(state.tabs.map((tab: MyAccountTab) => tab.id)).not.toContain('help');
    expect(state.selection).toEqual({tabId: 'home'});
  });

  it('builds a widget from blocks: their text in the language, and an address for buttons and images', async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'help', sectionId: 'support'}} />);

    expect(screen.queryByRole('textbox', {name: /Name in the menu/})).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', {name: 'Heading'}), 'Need help?');
    await user.type(screen.getByRole('textbox', {name: 'Label'}), 'Contact us');
    expect(state.text['en-US']).toEqual({
      'sections.support.heading': 'Need help?',
      'sections.support.open': 'Contact us',
    });

    await user.click(screen.getByRole('button', {name: 'Image'}));
    await user.type(screen.getByRole('textbox', {name: /Image address/}), 'https://support.example.com/team.png');
    await user.click(screen.getByRole('button', {name: 'Move Image up'}));

    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'help')?.sections[0].blocks).toEqual([
      {id: 'heading', type: 'heading'},
      {id: 'image', type: 'image', url: 'https://support.example.com/team.png'},
      {id: 'open', type: 'button', url: 'https://support.example.com'},
    ]);
  });

  it('removes a block with its text, and a widget with all of its text', async () => {
    const user = userEvent.setup();
    state.text = {'en-US': {'sections.support.heading': 'Need help?', 'sections.support.open': 'Contact us'}};
    render(<Harness selection={{tabId: 'help', sectionId: 'support'}} />);

    await user.click(screen.getByRole('button', {name: 'Remove Button'}));
    expect(state.text).toEqual({'en-US': {'sections.support.heading': 'Need help?'}});

    await user.click(screen.getByRole('button', {name: 'Delete'}));
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'help')?.sections).toEqual([]);
    expect(state.text).toEqual({});
    expect(state.selection).toEqual({tabId: 'help'});
  });

  it('changes the credential a credential component changes', async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'security', sectionId: 'password'}} />);

    const attribute: HTMLElement = screen.getByRole('textbox', {name: /Credential attribute/});
    await user.clear(attribute);
    await user.type(attribute, 'pin');

    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'security')?.sections[0]).toEqual({
      id: 'password',
      type: 'credential',
      attribute: 'pin',
    });
  });

  it('hides a component, and deletes a built-in menu item', async () => {
    const user = userEvent.setup();
    const {unmount} = render(<Harness selection={{tabId: 'security', sectionId: 'passkeys'}} />);

    await user.click(screen.getByRole('checkbox', {name: 'Hide'}));
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'security')?.sections[1]).toEqual({
      id: 'passkeys',
      type: 'passkeys',
      hidden: true,
    });
    unmount();

    render(<Harness selection={{tabId: 'security'}} />);
    await user.click(screen.getByRole('button', {name: 'Delete'}));
    expect(state.tabs.map((tab: MyAccountTab) => tab.id)).not.toContain('security');
  });

  it("changes a menu item's icon, and gives a built-in one its own back", async () => {
    const user = userEvent.setup();
    render(<Harness selection={{tabId: 'security'}} />);

    await user.click(screen.getByRole('button', {name: 'Star'}));
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'security')?.icon).toBe('star');

    await user.type(screen.getByRole('textbox', {name: /image address/}), 'https://cdn.example.com/lock.svg');
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'security')).toMatchObject({
      iconUrl: 'https://cdn.example.com/lock.svg',
    });
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'security')?.icon).toBeUndefined();

    await user.click(screen.getByRole('button', {name: 'Its own icon'}));
    expect(state.tabs.find((tab: MyAccountTab) => tab.id === 'security')).toEqual(DEFAULT_TABS[2]);
  });

  it('only shows a component without text, and changes nothing when read only', () => {
    render(<Harness readOnly selection={{tabId: 'security', sectionId: 'passkeys'}} />);

    expect(screen.getByText('Passkeys')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', {name: 'Hide'})).toBeDisabled();
    expect(screen.queryByRole('button', {name: 'Delete'})).not.toBeInTheDocument();
  });
});
