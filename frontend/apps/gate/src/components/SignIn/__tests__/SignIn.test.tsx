// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen} from '@thunderid/test-utils';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import SignIn from '../SignIn';

// Mock child components
vi.mock('../SignInBox', () => ({
  default: () => <div data-testid="signin-box">SignInBox</div>,
}));

vi.mock('../SignInSlogan', () => ({
  default: () => <div data-testid="signin-slogan">SignInSlogan</div>,
}));

// Mock useDesign hook
const mockUseDesign = vi.fn();
vi.mock('@thunderid/design', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@thunderid/design')>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    useDesign: () => mockUseDesign(),
  };
});

describe('SignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDesign.mockReturnValue({
      isDesignEnabled: false,
      isLoading: false,
    });
  });

  it('renders without crashing', () => {
    const {container} = render(<SignIn />);
    expect(container).toBeInTheDocument();
  });

  it('renders SignInBox component', () => {
    render(<SignIn />);
    expect(screen.getByTestId('signin-box')).toBeInTheDocument();
  });

  it('shows SignInSlogan when design is not enabled and not loading', () => {
    mockUseDesign.mockReturnValue({
      isDesignEnabled: false,
      isLoading: false,
    });
    render(<SignIn />);
    expect(screen.getByTestId('signin-slogan')).toBeInTheDocument();
  });

  it('hides SignInSlogan when design is enabled', () => {
    mockUseDesign.mockReturnValue({
      isDesignEnabled: true,
      isLoading: false,
    });
    render(<SignIn />);
    expect(screen.queryByTestId('signin-slogan')).not.toBeInTheDocument();
  });

  it('hides SignInSlogan while design is loading', () => {
    mockUseDesign.mockReturnValue({
      isDesignEnabled: false,
      isLoading: true,
    });
    render(<SignIn />);
    expect(screen.queryByTestId('signin-slogan')).not.toBeInTheDocument();
  });

  it('shows the side panel the layout sets, on the side it names', () => {
    mockUseDesign.mockReturnValue({
      isDesignEnabled: true,
      isLoading: false,
      layout: {
        sidePanel: {enabled: true, position: 'right', blocks: [{id: 'h', type: 'heading', text: 'A higher standard'}]},
      },
    });
    render(<SignIn />);

    const box = screen.getByTestId('signin-box');
    const headline = screen.getByText('A higher standard');
    expect(box.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('signin-slogan')).not.toBeInTheDocument();
  });

  it('puts the side panel before the form on the left', () => {
    mockUseDesign.mockReturnValue({
      isDesignEnabled: true,
      isLoading: false,
      layout: {sidePanel: {enabled: true, blocks: [{id: 'h', type: 'heading', text: 'A higher standard'}]}},
    });
    render(<SignIn />);

    const box = screen.getByTestId('signin-box');
    const headline = screen.getByText('A higher standard');
    expect(box.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('shows no side panel when the layout turns it off', () => {
    mockUseDesign.mockReturnValue({
      isDesignEnabled: true,
      isLoading: false,
      layout: {sidePanel: {enabled: false, blocks: [{id: 'h', type: 'heading', text: 'A higher standard'}]}},
    });
    render(<SignIn />);

    expect(screen.queryByText('A higher standard')).not.toBeInTheDocument();
  });
});
