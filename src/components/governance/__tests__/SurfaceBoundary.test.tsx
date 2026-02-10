import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurfaceBoundary } from '../SurfaceBoundary';
import { logGovernanceEvent, getGovernanceEvents } from '@/governance/events';

// Mock the events module to track logging
jest.mock('@/governance/events', () => ({
  logGovernanceEvent: jest.fn(),
  getGovernanceEvents: jest.fn(() => []),
}));

describe('SurfaceBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when surface is allowed in the current moment', () => {
    // PRIMARY_CARD is allowed in 'morning' moment
    render(
      <SurfaceBoundary surface="PRIMARY_CARD" moment="morning">
        <div data-testid="test-content">Hello World</div>
      </SurfaceBoundary>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(logGovernanceEvent).not.toHaveBeenCalled();
  });

  it('blocks and returns null when surface is not allowed in the current moment', () => {
    // EXPLORE is not allowed in 'morning' moment
    render(
      <SurfaceBoundary surface="EXPLORE" moment="morning">
        <div data-testid="test-content">Should Not Render</div>
      </SurfaceBoundary>
    );

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
  });

  it('logs SURFACE_BLOCKED event when blocking a surface', () => {
    // NAVIGATION is not allowed in 'morning' moment
    render(
      <SurfaceBoundary surface="NAVIGATION" moment="morning">
        <div>Should Not Render</div>
      </SurfaceBoundary>
    );

    expect(logGovernanceEvent).toHaveBeenCalledWith('SURFACE_BLOCKED', {
      surface: 'NAVIGATION',
      moment: 'morning',
    });
  });

  it('allows multiple surfaces in midday moment', () => {
    // Both PRIMARY_CARD and EXPLORE are allowed in 'midday'
    const { rerender } = render(
      <SurfaceBoundary surface="PRIMARY_CARD" moment="midday">
        <div data-testid="primary-card">Primary Card</div>
      </SurfaceBoundary>
    );
    expect(screen.getByTestId('primary-card')).toBeInTheDocument();

    rerender(
      <SurfaceBoundary surface="EXPLORE" moment="midday">
        <div data-testid="explore">Explore</div>
      </SurfaceBoundary>
    );
    expect(screen.getByTestId('explore')).toBeInTheDocument();
  });

  it('blocks surfaces not allowed in midday', () => {
    // HELP_NOW is not allowed in 'midday'
    render(
      <SurfaceBoundary surface="HELP_NOW" moment="midday">
        <div data-testid="help-now">Help Now</div>
      </SurfaceBoundary>
    );

    expect(screen.queryByTestId('help-now')).not.toBeInTheDocument();
    expect(logGovernanceEvent).toHaveBeenCalledWith('SURFACE_BLOCKED', {
      surface: 'HELP_NOW',
      moment: 'midday',
    });
  });

  it('uses moment override prop when provided', () => {
    // Override to 'afternoon' where only HELP_NOW is allowed
    render(
      <SurfaceBoundary surface="HELP_NOW" moment="afternoon">
        <div data-testid="help-content">Help Content</div>
      </SurfaceBoundary>
    );

    expect(screen.getByTestId('help-content')).toBeInTheDocument();
  });

  it('blocks PRIMARY_CARD in afternoon moment', () => {
    // PRIMARY_CARD is not allowed in 'afternoon'
    render(
      <SurfaceBoundary surface="PRIMARY_CARD" moment="afternoon">
        <div data-testid="primary">Primary</div>
      </SurfaceBoundary>
    );

    expect(screen.queryByTestId('primary')).not.toBeInTheDocument();
    expect(logGovernanceEvent).toHaveBeenCalledWith('SURFACE_BLOCKED', {
      surface: 'PRIMARY_CARD',
      moment: 'afternoon',
    });
  });

  it('allows LIBRARY in latenight moment', () => {
    // LIBRARY is allowed in 'latenight'
    render(
      <SurfaceBoundary surface="LIBRARY" moment="latenight">
        <div data-testid="library">Library</div>
      </SurfaceBoundary>
    );

    expect(screen.getByTestId('library')).toBeInTheDocument();
    expect(logGovernanceEvent).not.toHaveBeenCalled();
  });
});
