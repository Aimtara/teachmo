import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NhostProvider } from '@nhost/react';
import { ToastProvider } from '@/components/ui/toast';
import { nhost } from '@/lib/nhostClient';
import { axe, toHaveNoViolations } from 'jest-axe';
import './jestGlobals'; // Import Jest globals setup

expect.extend(toHaveNoViolations);

// Custom render function that includes all necessary providers
export function renderWithProviders(
  ui,
  {
    initialEntries = ['/'],
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <NhostProvider nhost={nhost}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NhostProvider>
      </MemoryRouter>
    );
  }

  const user = userEvent.setup();
  
  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user',
  user_type: 'parent',
  subscription_tier: 'free',
  points: 0,
  login_streak: 0,
  onboarding_completed: true,
  created_date: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockChild = (overrides = {}) => ({
  id: 'child-123',
  name: 'Test Child',
  age: 5,
  birth_date: '2019-01-01',
  grade_level: 'Kindergarten',
  interests: ['art', 'music'],
  challenges: [],
  learning_style: 'visual',
  avatar: '🧒',
  color: '#86efac',
  parent_id: 'user-123',
  created_date: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockActivity = (overrides = {}) => ({
  id: 'activity-123',
  title: 'Test Activity',
  description: 'A fun test activity',
  category: 'creative',
  age_range: { min_age: 3, max_age: 7 },
  duration: '30 minutes',
  materials_needed: ['paper', 'crayons'],
  instructions: ['Step 1', 'Step 2', 'Step 3'],
  learning_objectives: ['creativity', 'fine motor skills'],
  status: 'suggested',
  created_date: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockTip = (overrides = {}) => ({
  id: 'tip-123',
  title: 'Test Parenting Tip',
  summary: 'A helpful parenting tip for testing',
  why_it_matters: 'This helps with child development',
  action_steps: ['Talk to your child', 'Listen actively'],
  conversation_starter: 'How was your day?',
  category: 'communication',
  age_range: { min_age: 3, max_age: 12 },
  difficulty: 'easy',
  time_required: '5 minutes',
  is_read: false,
  created_date: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Common testing helpers used across specs and integration tests
export const testUtils = {
  async fillField(user, label, value) {
    const input = await screen.findByLabelText(label);
    await user.clear(input);
    await user.type(input, value);
  },
  async clickButton(user, name) {
    const button = await screen.findByRole('button', { name });
    await user.click(button);
  },
  async waitForElement(testId) {
    return screen.findByTestId(testId);
  },
  async waitForLoadingToFinish() {
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  },
};

// Accessibility helpers (currently lightweight stubs for future expansion)
export const a11yUtils = {
  async checkHeadingHierarchy(container = document.body) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return headings.length > 0;
  },
  checkFormLabels(container = document.body) {
    const inputs = container.querySelectorAll('input, textarea, select');
    return Array.from(inputs).every((input) => {
      const id = input.getAttribute('id');
      return !id || container.querySelector(`label[for="${id}"]`);
    });
  },
};

// Simple performance helpers to keep tests deterministic
export const performanceUtils = {
  async measureRenderTime(element) {
    const start = performance.now();
    render(element);
    return performance.now() - start;
  },
  checkCleanup() {
    // Placeholder hook for future resource cleanup checks
    expect(jest).toBeDefined();
  },
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { axe } from 'jest-axe';
