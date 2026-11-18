// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createContext, type ReactElement, type ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi, type MockInstance} from 'vitest';
import type {AccountTab} from '../../layout/accountLayout';
import MyAccountPreview from '../MyAccountPreview';
import {PREVIEW_MESSAGE_SOURCE, type PreviewState} from '../protocol';

vi.mock('@thunderid/react', () => ({
  Button: ({children, startIcon = null, ...props}: {children: ReactNode; startIcon?: ReactNode}) => (
    <button type="button" {...props}>
      {startIcon}
      {children}
    </button>
  ),
  I18nProvider: ({children}: {children: ReactNode}) => children,
  ThemeProvider: ({children}: {children: ReactNode}) => children,
  ThunderIDContext: createContext(null),
  Typography: ({children}: {children: ReactNode}) => <div>{children}</div>,
  UserDropdown: () => null,
  UserIcon: () => <svg />,
}));

vi.mock('../../components/AppShell', () => ({
  default: ({children, name}: {children: ReactNode; name: string}): ReactElement => (
    <div>
      <header>{name}</header>
      {children}
    </div>
  ),
}));

// Home as a component that renders again only for new text, as the compiled one does.
vi.mock('../../components/AccountHome', async () => {
  const {memo} = await import('react');
  const {useTranslation} = await import('react-i18next');
  return {
    AccountHomeView: memo(
      function HomeView({sections}: {sections: {id: string}[]}): ReactElement {
        const {t} = useTranslation();
        return (
          <div>
            <p>{t('home.subtitle')}</p>
            Home cards: {sections.map((section) => section.id).join(', ')}
          </div>
        );
      },
      () => true,
    ),
  };
});

vi.mock('../PreviewSectionView', () => ({
  default: ({section}: {section: {id: string}}): ReactElement => <div>Component {section.id}</div>,
}));

// The overlay as a button that drops the passkeys component at the end, and names the selection.
vi.mock('../PreviewOverlay', () => ({
  default: ({
    onDrop,
    selection,
  }: {
    onDrop: (drop: {beforeId: string | null; id: string; kind: string}) => void;
    selection: {sectionId?: string; tabId: string};
  }): ReactElement => (
    <button type="button" onClick={() => onDrop({kind: 'section', id: 'passkeys', beforeId: null})}>
      Selected {selection.sectionId ?? selection.tabId}
    </button>
  ),
}));

const TABS: AccountTab[] = [
  {id: 'home', sections: [{id: 'apps-summary', type: 'home.apps'}]},
  {id: 'security', sections: [{id: 'passkeys', type: 'passkeys'}]},
  {id: 'devices', hidden: true, sections: []},
];

const stateOf = (overrides: Partial<PreviewState> = {}): PreviewState => ({
  accent: '#ff7300',
  application: {name: 'Acme Account'},
  colorScheme: 'light',
  designTheme: null,
  editable: true,
  labels: {},
  language: 'en-US',
  selection: {tabId: 'security'},
  strings: {addComponent: 'Add component', addTab: 'Add new feature', hidden: 'Hidden'},
  tabs: TABS,
  text: {},
  ...overrides,
});

// A message as the Console's editor sends it: from the parent window, on this origin.
const send = (state: PreviewState, origin: string = window.location.origin): void => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {source: PREVIEW_MESSAGE_SOURCE, type: 'state', state},
        origin,
        source: window.parent,
      }),
    );
  });
};

const menu = (): string[] =>
  within(screen.getByRole('navigation'))
    .getAllByRole('button')
    .map((button: HTMLElement) => button.textContent ?? '');

const posted = (post: MockInstance, type: string): unknown =>
  (post.mock.calls as [{type: string}][]).map(([message]) => message).find((message) => message.type === type);

describe('MyAccountPreview', () => {
  let post: MockInstance;

  beforeEach(() => {
    post = vi.spyOn(window.parent, 'postMessage');
  });

  it('tells the editor it is ready, and renders nothing until it has the draft', () => {
    const {container} = render(<MyAccountPreview />);

    expect(post).toHaveBeenCalledWith({type: 'ready', source: PREVIEW_MESSAGE_SOURCE}, window.location.origin);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the draft's tabs in order, with its text, on the selected tab, and marks the hidden ones", () => {
    const {container} = render(<MyAccountPreview />);

    send(stateOf({text: {'tabs.security': 'Sign-in'}}));

    expect(screen.getByText('Acme Account')).toBeInTheDocument();
    expect(menu()).toEqual(['Home', 'Sign-in', 'Devices']);
    expect(container.querySelector('.preview-region--hidden')).toHaveAttribute('data-preview-id', 'devices');
    expect(screen.getByText('Component passkeys')).toBeInTheDocument();
    expect(screen.getByText('Selected security')).toBeInTheDocument();
  });

  it("dims the whole page of a hidden tab, and only a shown tab's hidden components", () => {
    const {container} = render(<MyAccountPreview />);

    send(stateOf());
    expect(container.querySelector('.preview-page--hidden')).toBeNull();

    send(
      stateOf({
        selection: {tabId: 'security'},
        tabs: [TABS[0], {...TABS[1], hidden: true}, TABS[2]],
      }),
    );
    expect(container.querySelector('.preview-page--hidden')).toContainElement(screen.getByText('Component passkeys'));
  });

  it("shows My Account's own text again when the draft's is cleared", () => {
    render(<MyAccountPreview />);

    send(stateOf({text: {'tabs.security': 'Sign-in'}}));
    send(stateOf({text: {}}));

    expect(menu()).toEqual(['Home', 'Security', 'Devices']);
  });

  it("shows Home's changed text as it is typed", () => {
    render(<MyAccountPreview />);

    send(stateOf({selection: {tabId: 'home'}, text: {'home.subtitle': 'Manage your info.'}}));
    expect(screen.getByText('Manage your info.')).toBeInTheDocument();

    send(stateOf({selection: {tabId: 'home'}, text: {'home.subtitle': 'Manage your info and security.'}}));
    expect(screen.getByText('Manage your info and security.')).toBeInTheDocument();
  });

  it('asks the editor for its form to add a menu item from the button under the menu', () => {
    render(<MyAccountPreview />);
    send(stateOf());

    fireEvent.click(screen.getByRole('button', {name: /Add new feature/}));

    expect(posted(post, 'openAddTab')).toMatchObject({type: 'openAddTab', source: PREVIEW_MESSAGE_SOURCE});
  });

  it('ignores a draft from another origin', () => {
    const {container} = render(<MyAccountPreview />);

    send(stateOf(), 'https://evil.example.com');

    expect(container).toBeEmptyDOMElement();
  });

  it('asks the editor to open its menu of components beside the add space, for the shown tab', () => {
    render(<MyAccountPreview />);
    send(stateOf());

    fireEvent.click(screen.getByRole('button', {name: 'Add component'}));

    expect(posted(post, 'openAdd')).toEqual({
      type: 'openAdd',
      tabId: 'security',
      anchor: {left: 0, top: 0, width: 0, height: 0},
      source: PREVIEW_MESSAGE_SOURCE,
    });
  });

  it('asks the editor to move a dropped component within the shown tab', () => {
    render(<MyAccountPreview />);
    send(stateOf());

    fireEvent.click(screen.getByRole('button', {name: 'Selected security'}));

    expect(posted(post, 'moveSection')).toEqual({
      type: 'moveSection',
      tabId: 'security',
      id: 'passkeys',
      beforeId: null,
      source: PREVIEW_MESSAGE_SOURCE,
    });
  });

  it('offers no add space when the layout cannot be changed', () => {
    render(<MyAccountPreview />);
    send(stateOf({editable: false}));

    expect(screen.queryByRole('button', {name: 'Add component'})).not.toBeInTheDocument();
  });
});
