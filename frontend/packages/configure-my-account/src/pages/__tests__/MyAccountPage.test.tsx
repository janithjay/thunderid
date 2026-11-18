// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import userEvent from '@testing-library/user-event';
import {render, screen, waitFor} from '@thunderid/test-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {MyAccountApplication} from '../../models/my-account';
import MyAccountPage from '../MyAccountPage';

vi.mock('../../api/useGetProjectApplications', () => ({default: vi.fn()}));
vi.mock('../../api/useGetMyAccountApplication', () => ({default: vi.fn()}));
vi.mock('../../api/useSaveMyAccountLayout', () => ({default: vi.fn()}));
vi.mock('../../api/useGetApplicationTheme', () => ({default: () => undefined}));
// The preview as buttons that ask for what a click, a drop, the add space or the menu's add button in the real
// one asks for.
vi.mock('../../components/MyAccountPreview', () => ({
  default: ({
    onAddTab,
    onChange,
    onRestoreTab,
    onSelect,
  }: {
    onAddTab: (name: string, icon: {icon?: string}) => void;
    onChange: (change: Record<string, unknown>) => void;
    onRestoreTab: (tabId: string) => void;
    onSelect: (selection: Record<string, string>) => void;
  }) => (
    <>
      {['home', 'personal', 'security', 'devices'].map((tabId: string) => (
        <button key={tabId} type="button" onClick={() => onSelect({tabId})}>
          {`Preview select ${tabId}`}
        </button>
      ))}
      <button type="button" onClick={() => onRestoreTab('security')}>
        Preview restore security
      </button>
      <button type="button" onClick={() => onAddTab('Help', {icon: 'help'})}>
        Preview add menu item
      </button>
      <button type="button" onClick={() => onChange({type: 'add', tabId: 'security', component: 'widget'})}>
        Preview add
      </button>
      <button type="button" onClick={() => onChange({type: 'moveTab', id: 'devices', beforeId: 'home'})}>
        Preview move
      </button>
    </>
  ),
}));

vi.mock('@thunderid/contexts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@thunderid/contexts')>()),
  useCapabilitiesContext: vi.fn(),
}));

const {default: useGetProjectApplications} = await import('../../api/useGetProjectApplications');
const {default: useGetMyAccountApplication} = await import('../../api/useGetMyAccountApplication');
const {default: useSaveMyAccountLayout} = await import('../../api/useSaveMyAccountLayout');
const {useCapabilitiesContext} = await import('@thunderid/contexts');

const APPLICATION: MyAccountApplication = {id: 'app-1', name: 'Acme Account', metadata: {}};

const query = (data: unknown): unknown => ({data, isLoading: false, isError: false});

describe('MyAccountPage', () => {
  let mutate: ReturnType<typeof vi.fn>;
  let can: boolean;

  beforeEach(() => {
    mutate = vi.fn();
    can = true;
    vi.mocked(useGetProjectApplications).mockReturnValue(
      query([
        {id: 'other', name: 'My Account'},
        {id: 'app-1', name: 'Acme Account', clientId: 'MY_ACCOUNT'},
      ]) as ReturnType<typeof useGetProjectApplications>,
    );
    vi.mocked(useGetMyAccountApplication).mockImplementation(
      (id: string | undefined) =>
        query(id === 'app-1' ? APPLICATION : undefined) as ReturnType<typeof useGetMyAccountApplication>,
    );
    vi.mocked(useSaveMyAccountLayout).mockReturnValue({
      mutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSaveMyAccountLayout>);
    vi.mocked(useCapabilitiesContext).mockReturnValue({
      can: () => can,
    } as unknown as ReturnType<typeof useCapabilitiesContext>);
  });

  it('edits the application My Account signs in with, found by its client ID', () => {
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    expect(useGetMyAccountApplication).toHaveBeenLastCalledWith('app-1');
    expect(screen.getByRole('checkbox', {name: 'Hide'})).toBeInTheDocument();
  });

  it('saves the draft into the application, and reverts it', async () => {
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);
    const save: HTMLElement = screen.getByRole('button', {name: 'Save'});
    const revert: HTMLElement = screen.getByRole('button', {name: 'Revert'});
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('button', {name: 'Preview select devices'}));
    await user.click(screen.getByRole('checkbox', {name: 'Hide'}));
    expect(revert).toBeEnabled();
    await user.click(revert);
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('checkbox', {name: 'Hide'}));
    await user.click(save);

    expect(mutate).toHaveBeenCalledTimes(1);
    const [{application, layout}] = mutate.mock.calls[0] as [
      {application: MyAccountApplication; layout: {tabs: {hidden?: boolean; id: string}[]}},
    ];
    expect(application).toBe(APPLICATION);
    expect(layout.tabs.find((tab) => tab.id === 'devices')?.hidden).toBe(true);
  });

  it('applies what the preview asks for, and selects a component added there', async () => {
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    await user.click(screen.getByRole('button', {name: 'Preview move'}));
    await user.click(screen.getByRole('button', {name: 'Preview add'}));
    await user.click(screen.getByRole('button', {name: 'Save'}));

    const [{layout}] = mutate.mock.calls[0] as [
      {layout: {tabs: {id: string; sections: {id: string}[]}[]; text: Record<string, Record<string, string>>}},
    ];
    expect(layout.tabs.map((tab) => tab.id)).toEqual(['devices', 'home', 'personal', 'security']);
    expect(layout.tabs[3].sections.map((section) => section.id)).toEqual(['password', 'passkeys', 'widget']);
    expect(layout.text['en-US']?.['sections.widget.heading']).toBe('New widget');
    // The widget added is selected, so its blocks are edited on the right.
    expect(screen.getByRole('textbox', {name: 'Heading'})).toHaveValue('New widget');
  });

  it('adds a menu item named in the preview, and selects it', async () => {
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    await user.click(screen.getByRole('button', {name: 'Preview add menu item'}));
    await user.click(screen.getByRole('button', {name: 'Save'}));

    const [{layout}] = mutate.mock.calls[0] as [
      {layout: {tabs: {custom?: boolean; icon?: string; id: string}[]; text: Record<string, Record<string, string>>}},
    ];
    expect(layout.tabs[4]).toEqual({id: 'help', custom: true, icon: 'help', sections: []});
    expect(layout.text['en-US']?.['tabs.help']).toBe('Help');
    expect(screen.getByRole('textbox', {name: /Name in the menu/})).toHaveValue('Help');
  });

  it('closes the properties panel, and opens it again when something is selected', async () => {
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    const close: HTMLElement = screen.getByRole('button', {name: 'Close properties'});
    expect(close).toBeVisible();

    await user.click(close);
    await waitFor(() => expect(close).not.toBeVisible());

    await user.click(screen.getByRole('button', {name: 'Preview select devices'}));
    await waitFor(() => expect(close).toBeVisible());
  });

  it('deletes a built-in menu item, and brings it back at the end', async () => {
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    await user.click(screen.getByRole('button', {name: 'Preview select security'}));
    await user.click(screen.getByRole('button', {name: 'Delete'}));
    await user.click(screen.getByRole('button', {name: 'Preview restore security'}));
    await user.click(screen.getByRole('button', {name: 'Preview move'}));
    await user.click(screen.getByRole('button', {name: 'Save'}));

    const [{layout}] = mutate.mock.calls[0] as [{layout: {tabs: {id: string; sections: {id: string}[]}[]}}];
    expect(layout.tabs.map((tab) => tab.id)).toEqual(['devices', 'home', 'personal', 'security']);
    expect(layout.tabs[3].sections.map((section) => section.id)).toEqual(['password', 'passkeys']);
  });

  it('ignores what the preview asks for without permission to update applications', async () => {
    can = false;
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    await user.click(screen.getByRole('button', {name: 'Preview add'}));

    expect(screen.queryByText('Custom widget')).not.toBeInTheDocument();
  });

  it('does not save a layout that shows no tab', async () => {
    const user = userEvent.setup();
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    for (const tabId of ['home', 'personal', 'security', 'devices']) {
      await user.click(screen.getByRole('button', {name: `Preview select ${tabId}`}));
      await user.click(screen.getByRole('checkbox', {name: 'Hide'}));
    }

    expect(screen.getByText('Show at least one tab.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save'})).toBeDisabled();
  });

  it('does not save without permission to update applications', () => {
    can = false;
    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    expect(screen.getByRole('checkbox', {name: 'Hide'})).toBeDisabled();
    expect(screen.queryByRole('button', {name: 'Delete'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save'})).toBeDisabled();
  });

  it('explains when the project has no My Account application', () => {
    vi.mocked(useGetProjectApplications).mockReturnValue(
      query([{id: 'web', name: 'Web'}]) as ReturnType<typeof useGetProjectApplications>,
    );

    render(<MyAccountPage previewUrl="/console/myaccount-preview.html" />);

    expect(screen.getByText(/This project has no My Account application/)).toBeInTheDocument();
  });
});
