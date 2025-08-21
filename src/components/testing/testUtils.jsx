import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/toast';
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
        <ToastProvider>
          {children}
        </ToastProvider>
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

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { axe } from 'jest-axe';