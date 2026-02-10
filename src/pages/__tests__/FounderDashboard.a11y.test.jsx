import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import FounderDashboard from '@/pages/FounderDashboard.jsx';
import { getGovernanceEvents } from '@/governance/events';

expect.extend(toHaveNoViolations);

// Mock the governance events
jest.mock('@/governance/events', () => ({
  getGovernanceEvents: jest.fn(() => []),
}));

describe('FounderDashboard accessibility', () => {
  it('passes basic a11y checks with no events', async () => {
    getGovernanceEvents.mockReturnValue([]);

    const { container } = render(<FounderDashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes a11y checks with sample events', async () => {
    getGovernanceEvents.mockReturnValue([
      {
        type: 'SURFACE_BLOCKED',
        surface: 'EXPLORE',
        moment: 'morning',
        timestamp: 1706889600000,
      },
      {
        type: 'COGNITIVE_BUDGET_EXCEEDED',
        moment: 'afternoon',
        timestamp: 1706893200000,
      },
    ]);

    const { container } = render(<FounderDashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
