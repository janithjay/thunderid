// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CapabilitiesProvider, ProjectScopeProvider} from '@thunderid/contexts';
import {fireEvent, render, screen, waitFor} from '@thunderid/test-utils';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import DesignPage from '../DesignPage';

const {mockNavigate, mockShowToast, mockRefetchThemes, mockRefetchLayouts, mockUseGetLayouts, mockCreateLayout} =
  vi.hoisted(() => ({
    mockCreateLayout: vi.fn(),
    mockNavigate: vi.fn(),
    mockShowToast: vi.fn(),
    mockRefetchThemes: vi.fn(),
    mockRefetchLayouts: vi.fn(),
    mockUseGetLayouts: vi.fn(),
  }));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@thunderid/contexts', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/contexts')>('@thunderid/contexts');
  return {
    ...actual,
    useToast: () => ({showToast: mockShowToast}),
  };
});

interface MockTheme {
  id: string;
  displayName: string;
  isReadOnly?: boolean;
}

let themesError: Error | null = null;
let layoutsError: Error | null = null;
let layoutsList: {id: string; handle: string; displayName: string; layout: unknown}[] = [];
let themesList: MockTheme[] = [];
let themesLoadingState = false;
let themesParams: unknown;

vi.mock('@thunderid/design', () => ({
  useGetThemes: (params: unknown) => {
    themesParams = params;
    return {
      data: {themes: themesList},
      isLoading: themesLoadingState,
      error: themesError,
      refetch: mockRefetchThemes,
    };
  },
  useGetLayouts: (params?: {projectId?: string}) => {
    mockUseGetLayouts(params);
    return {
      data: {layouts: layoutsList},
      error: layoutsError,
      refetch: mockRefetchLayouts,
    };
  },
  useDeleteTheme: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false}),
  useDeleteLayout: () => ({mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false}),
  useCreateLayout: () => ({mutate: mockCreateLayout, isPending: false}),
  useGetLayout: (id: string) => ({
    data: id ? {id, handle: 'centered', displayName: 'Centered', layout: {screens: {}}} : undefined,
    isError: false,
  }),
  useGetThemeUsages: () => ({data: undefined, isLoading: false}),
}));

const viewOnly = {
  can: (_resource: string, action = 'view') => action === 'view',
  isLoading: false,
};

describe('DesignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    themesError = null;
    layoutsError = null;
    layoutsList = [{id: 'layout-1', handle: 'centered', displayName: 'Centered', layout: {}}];
    themesList = [];
    themesLoadingState = false;
  });

  it('renders the themes and layouts section headers', () => {
    render(<DesignPage />);
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('Layouts')).toBeInTheDocument();
  });

  it("lists the selected project's layouts", () => {
    render(
      <ProjectScopeProvider project={{id: 'project-1'}}>
        <DesignPage />
      </ProjectScopeProvider>,
    );

    expect(screen.getByText('Layouts')).toBeInTheDocument();
    expect(screen.getByText('Centered')).toBeInTheDocument();
    expect(mockUseGetLayouts).toHaveBeenCalledWith({projectId: 'project-1'});
  });

  it('lists every layout without a selected project', () => {
    render(<DesignPage />);

    expect(screen.getByText('Centered')).toBeInTheDocument();
    expect(mockUseGetLayouts).toHaveBeenCalledWith({projectId: undefined});
  });

  it('sets the document title', async () => {
    render(<DesignPage />);
    await waitFor(() => expect(document.title).toBe('Design | ThunderID'));
  });

  it('renders an inline read error for themes without affecting the layouts section', () => {
    themesError = new Error('Network error');

    render(<DesignPage />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    // Layouts section still renders normally
    expect(screen.getByText('Centered')).toBeInTheDocument();
  });

  it('retries the themes query when the read error action is clicked', () => {
    themesError = new Error('Network error');

    render(<DesignPage />);

    fireEvent.click(screen.getByRole('button', {name: /Refresh/i}));

    expect(mockRefetchThemes).toHaveBeenCalledTimes(1);
  });

  it('renders an inline read error for layouts without affecting the themes section', () => {
    layoutsError = new Error('Network error');

    render(<DesignPage />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    expect(screen.queryByText('Centered')).not.toBeInTheDocument();
  });

  it('renders every layout returned by the backend', () => {
    layoutsList = [
      {id: 'layout-1', handle: 'centered', displayName: 'Centered', layout: {}},
      {id: 'layout-2', handle: 'centered2', displayName: 'Centered2', layout: {}},
    ];

    render(<DesignPage />);

    expect(screen.getByText('Centered')).toBeInTheDocument();
    expect(screen.getByText('Centered2')).toBeInTheDocument();
  });

  it('shows an empty state when there are no layouts', () => {
    layoutsList = [];

    render(<DesignPage />);

    expect(screen.getByText('No layouts yet')).toBeInTheDocument();
  });

  it('navigates to a layout when its card is clicked', () => {
    render(<DesignPage />);

    fireEvent.click(screen.getByText('Centered'));

    expect(mockNavigate).toHaveBeenCalledWith('/design/layouts/layout-1');
  });

  it('creates a layout as a copy of one the project has, and opens it', async () => {
    mockCreateLayout.mockImplementation((_request: unknown, {onSuccess}: {onSuccess: (layout: unknown) => void}) =>
      onSuccess({id: 'layout-9'}),
    );
    render(<DesignPage />);

    fireEvent.click(screen.getByRole('button', {name: 'Add layout'}));
    fireEvent.change(screen.getByRole('textbox', {name: /Name/}), {target: {value: 'Centered'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create layout'}));

    expect(mockCreateLayout).toHaveBeenCalledWith(
      {handle: 'centered-2', displayName: 'Centered', layout: {screens: {}}},
      expect.any(Object),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/design/layouts/layout-9'));
  });

  it('offers to delete a layout the project made, and keeps the built-in ones', () => {
    layoutsList = [
      {id: 'layout-1', handle: 'centered', displayName: 'Centered', layout: {}},
      {id: 'layout-2', handle: 'sign-in-with-picture', displayName: 'Sign-in with picture', layout: {}},
    ];
    render(<DesignPage />);

    const deletes: HTMLElement[] = screen.getAllByRole('button', {name: 'Delete'});
    expect(deletes).toHaveLength(1);
    fireEvent.click(deletes[0]);

    expect(screen.getByText('Are you sure you want to delete "Sign-in with picture"?')).toBeInTheDocument();
  });

  it('hides Add layout when the admin may only view designs', () => {
    render(
      <CapabilitiesProvider capabilities={viewOnly}>
        <DesignPage />
      </CapabilitiesProvider>,
    );

    expect(screen.queryByRole('button', {name: 'Add layout'})).not.toBeInTheDocument();
  });

  it('navigates to the themes create page when Add Theme is clicked', async () => {
    render(<DesignPage />);

    fireEvent.click(screen.getByRole('button', {name: 'Add theme'}));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/design/themes/create');
    });
  });

  it('hides Add theme and theme delete actions when the admin may only view designs', () => {
    themesList = [{id: 'theme-1', displayName: 'Midnight'}];
    render(
      <CapabilitiesProvider capabilities={viewOnly}>
        <DesignPage />
      </CapabilitiesProvider>,
    );

    expect(screen.getByText('Midnight')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Add theme'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Delete'})).not.toBeInTheDocument();
  });

  it('renders skeleton placeholders while themes are loading', () => {
    themesLoadingState = true;

    const {container} = render(<DesignPage />);

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders every theme returned by the backend', () => {
    themesList = [
      {id: 'theme-1', displayName: 'Midnight'},
      {id: 'theme-2', displayName: 'Sunrise'},
    ];

    render(<DesignPage />);

    expect(screen.getByText('Midnight')).toBeInTheDocument();
    expect(screen.getByText('Sunrise')).toBeInTheDocument();
  });

  it('navigates to a theme when its card is clicked', () => {
    themesList = [{id: 'theme-1', displayName: 'Midnight'}];

    render(<DesignPage />);

    fireEvent.click(screen.getByText('Midnight'));

    expect(mockNavigate).toHaveBeenCalledWith('/design/themes/theme-1');
  });

  it('opens the delete dialog for an editable theme', () => {
    themesList = [{id: 'theme-1', displayName: 'Midnight', isReadOnly: false}];

    render(<DesignPage />);

    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));

    expect(screen.getByText('Delete theme')).toBeInTheDocument();
  });

  it('does not render a delete action for a read-only theme', () => {
    themesList = [{id: 'theme-1', displayName: 'Midnight', isReadOnly: true}];

    render(<DesignPage />);

    expect(screen.queryByRole('button', {name: 'Delete'})).not.toBeInTheDocument();
  });

  it('closes the delete dialog when it is dismissed', async () => {
    themesList = [{id: 'theme-1', displayName: 'Midnight'}];

    render(<DesignPage />);

    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
    expect(screen.getByText('Delete theme')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    await waitFor(() => {
      expect(screen.queryByText('Delete theme')).not.toBeInTheDocument();
    });
  });

  it('shows a "show more" affordance when there are more themes than the initial limit', () => {
    themesList = Array.from({length: 10}, (_, i) => ({id: `theme-${i}`, displayName: `Theme ${i}`}));

    render(<DesignPage />);

    expect(screen.getByText('Show 2 more')).toBeInTheDocument();
    expect(screen.queryByText('Theme 9')).not.toBeInTheDocument();
  });

  it('reveals every theme after clicking "show more"', () => {
    themesList = Array.from({length: 10}, (_, i) => ({id: `theme-${i}`, displayName: `Theme ${i}`}));

    render(<DesignPage />);

    fireEvent.click(screen.getByText('Show 2 more'));

    expect(screen.getByText('Theme 9')).toBeInTheDocument();
  });

  it('renders an inline read error for layouts and retries when its action is clicked', () => {
    layoutsError = new Error('Network error');

    render(<DesignPage />);

    fireEvent.click(screen.getAllByRole('button', {name: /Refresh/i})[0]);

    expect(mockRefetchLayouts).toHaveBeenCalledTimes(1);
  });

  it('lists the themes of the selected project', () => {
    render(
      <ProjectScopeProvider project={{id: 'project-1'}}>
        <DesignPage />
      </ProjectScopeProvider>,
    );

    expect(themesParams).toEqual({projectId: 'project-1'});
  });

  it('lists every theme outside a project', () => {
    render(<DesignPage />);

    expect(themesParams).toEqual({projectId: undefined});
  });
});
