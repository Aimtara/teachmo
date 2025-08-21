import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/toast';
import { AccessibilityProvider } from '@/components/shared/AccessibilityProvider';
import { FocusStylesProvider } from '@/components/shared/FocusStyles';
import { TutorialProvider } from '@/components/tour/TutorialSystem';
import { UndoRedoProvider } from '@/components/shared/UndoRedoSystem';
import { NotificationProvider } from '@/components/shared/SmartNotifications';

// Mock data generators
export const mockUser = (overrides = {}) => ({
  id: 'user123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'parent',
  status: 'active',
  subscription_tier: 'free',
  login_streak: 5,
  points: 250,
  onboarding_completed: true,
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

export const mockChild = (overrides = {}) => ({
  id: 'child123',
  name: 'Test Child',
  age: 7,
  birth_date: '2017-03-15',
  grade_level: '2nd Grade',
  school_name: 'Test Elementary School',
  learning_style: 'visual',
  interests: ['art', 'science'],
  avatar: '🎨',
  color: '#4F46E5',
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

export const mockActivity = (overrides = {}) => ({
  id: 'activity123',
  title: 'Color Mixing Experiment',
  description: 'Learn about primary and secondary colors through hands-on mixing.',
  category: 'creative',
  age_range: { min_age: 5, max_age: 10 },
  duration: '30 minutes',
  materials_needed: ['Paint', 'Brushes', 'Paper'],
  instructions: ['Set up workspace', 'Mix colors', 'Create artwork'],
  learning_objectives: ['Understanding color theory', 'Fine motor skills'],
  status: 'suggested',
  is_personalized: false,
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

export const mockParentingTip = (overrides = {}) => ({
  id: 'tip123',
  title: 'Encouraging Creative Expression',
  summary: 'Foster your child\'s creativity with open-ended activities.',
  why_it_matters: 'Creative expression builds confidence and problem-solving skills.',
  action_steps: [
    'Provide art supplies without specific instructions',
    'Ask open-ended questions about their creations',
    'Display their artwork proudly'
  ],
  conversation_starter: 'Tell me about what you\'re creating!',
  category: 'creativity',
  age_range: { min_age: 3, max_age: 12 },
  difficulty: 'easy',
  time_required: '15 minutes',
  is_read: false,
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

export const mockMessage = (overrides = {}) => ({
  id: 'message123',
  sender_id: 'user123',
  recipient_id: 'teacher456',
  content: 'Hello, I wanted to discuss my child\'s progress.',
  message_type: 'text',
  is_read: false,
  thread_id: 'thread123',
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

export const mockTeacher = (overrides = {}) => ({
  id: 'teacher456',
  email: 'teacher@school.edu',
  full_name: 'Ms. Johnson',
  role: 'teacher',
  status: 'active',
  school_id: 'school123',
  google_classroom_connected: false,
  onboarding_completed: true,
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

export const mockCourse = (overrides = {}) => ({
  id: 'course123',
  external_id: 'gc_course_456',
  source_system: 'google_classroom',
  name: '2nd Grade Math',
  course_code: '2A-MATH',
  teacher_id: 'teacher456',
  school_id: 'school123',
  created_date: '2024-01-15T10:30:00Z',
  ...overrides
});

// Custom render function that includes all providers
export const renderWithProviders = (ui, options = {}) => {
  const { 
    initialEntries = ['/'],
    mockUserData = null,
    ...renderOptions 
  } = options;

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <ToastProvider>
          <AccessibilityProvider>
            <FocusStylesProvider>
              <TutorialProvider>
                <UndoRedoProvider>
                  <NotificationProvider>
                    {children}
                  </NotificationProvider>
                </UndoRedoProvider>
              </TutorialProvider>
            </FocusStylesProvider>
          </AccessibilityProvider>
        </ToastProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Common test utilities
export const findByTextContent = (text) => {
  return screen.findByText((content, node) => {
    const hasText = (node) => node.textContent === text;
    const nodeHasText = hasText(node);
    const childrenDontHaveText = Array.from(node?.children || []).every(
      (child) => !hasText(child)
    );
    return nodeHasText && childrenDontHaveText;
  });
};

export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
};

export const expectToastMessage = async (message) => {
  await waitFor(() => {
    expect(screen.getByText(message)).toBeInTheDocument();
  });
};

// Mock entity methods for testing
export const createMockEntityMethods = (entityName, mockData = []) => ({
  list: jest.fn().mockResolvedValue(mockData),
  filter: jest.fn().mockResolvedValue(mockData),
  create: jest.fn().mockResolvedValue({ id: 'new-id', ...mockData[0] }),
  update: jest.fn().mockResolvedValue({ ...mockData[0], updated: true }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  get: jest.fn().mockResolvedValue(mockData[0]),
  bulkCreate: jest.fn().mockResolvedValue(mockData),
  me: jest.fn().mockResolvedValue(mockUser()),
  updateMyUserData: jest.fn().mockResolvedValue(mockUser()),
  logout: jest.fn().mockResolvedValue({ success: true }),
  login: jest.fn().mockResolvedValue({ success: true }),
  loginWithRedirect: jest.fn().mockResolvedValue({ success: true })
});

// Mock function calls for testing
export const createMockFunctionCall = (returnValue = { data: { success: true } }) => 
  jest.fn().mockResolvedValue(returnValue);

// Form testing utilities
export const fillForm = async (fields) => {
  for (const [fieldName, value] of Object.entries(fields)) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                   screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                   screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
    
    if (field.type === 'checkbox' || field.type === 'radio') {
      fireEvent.click(field);
    } else if (field.tagName === 'SELECT') {
      fireEvent.change(field, { target: { value } });
    } else {
      fireEvent.change(field, { target: { value } });
    }
  }
};

export const submitForm = async (buttonText = /submit|save|create/i) => {
  const submitButton = screen.getByRole('button', { name: buttonText });
  fireEvent.click(submitButton);
  await waitFor(() => {
    expect(submitButton).not.toBeDisabled();
  });
};

// Navigation testing utilities
export const expectCurrentPage = (pageName) => {
  expect(window.location.pathname).toContain(pageName.toLowerCase());
};

export const navigateToPage = async (linkText) => {
  const link = screen.getByRole('link', { name: new RegExp(linkText, 'i') });
  fireEvent.click(link);
  await waitFor(() => {
    expect(link).toBeInTheDocument();
  });
};

// Accessibility testing utilities
export const expectAccessibleForm = (formElement) => {
  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    expect(input).toHaveAttribute('id');
    const label = formElement.querySelector(`label[for="${input.id}"]`);
    expect(label).toBeInTheDocument();
  });
};

export const expectKeyboardNavigation = async (element) => {
  element.focus();
  expect(element).toHaveFocus();
  
  fireEvent.keyDown(element, { key: 'Tab' });
  await waitFor(() => {
    expect(document.activeElement).not.toBe(element);
  });
};

// Performance testing utilities
export const measureRenderTime = (componentName, renderFn) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  console.log(`${componentName} render time: ${end - start}ms`);
  return result;
};

export default {
  renderWithProviders,
  mockUser,
  mockChild,
  mockActivity,
  mockParentingTip,
  mockMessage,
  mockTeacher,
  mockCourse,
  findByTextContent,
  waitForLoadingToFinish,
  expectToastMessage,
  createMockEntityMethods,
  createMockFunctionCall,
  fillForm,
  submitForm,
  expectCurrentPage,
  navigateToPage,
  expectAccessibleForm,
  expectKeyboardNavigation,
  measureRenderTime
};