import React from 'react';
import { renderWithProviders, screen, waitFor } from '../testing/testUtils';
import Dashboard from '@/pages/Dashboard';
import ActivityCard from '@/components/activities/ActivityCard';
import { axe } from 'jest-axe';

describe('UI Regression Tests', () => {
  beforeEach(() => {
    // Mock all required entities
    const { User } = require('@/api/entities');
    const { Child } = require('@/api/entities');
    const { Activity } = require('@/api/entities');
    const { ParentingTip } = require('@/api/entities');

    User.me = jest.fn().mockResolvedValue({ 
      full_name: 'Test User',
      user_type: 'parent',
      subscription_tier: 'free'
    });
    Child.list = jest.fn().mockResolvedValue([
      { id: '1', name: 'Child 1', age: 5 },
      { id: '2', name: 'Child 2', age: 8 }
    ]);
    Activity.filter = jest.fn().mockResolvedValue([
      { id: '1', title: 'Test Activity', status: 'planned' }
    ]);
    ParentingTip.list = jest.fn().mockResolvedValue([
      { id: '1', title: 'Test Tip', category: 'communication' }
    ]);
  });

  describe('Layout Consistency', () => {
    it('Dashboard maintains consistent layout across screen sizes', async () => {
      // Test mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));

      const { container: mobileContainer } = renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Verify mobile-specific elements
      expect(mobileContainer.querySelector('[data-mobile-menu]')).toBeInTheDocument();
      
      // Test desktop viewport  
      global.innerWidth = 1024;
      global.innerHeight = 768;
      global.dispatchEvent(new Event('resize'));

      const { container: desktopContainer } = renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Verify desktop-specific elements
      expect(desktopContainer.querySelector('[data-sidebar]')).toBeInTheDocument();
    });

    it('Components maintain proper spacing and alignment', () => {
      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity with a Very Long Title That Should Wrap Properly',
        description: 'This is a long description that should maintain proper spacing and not overflow its container boundaries.',
        status: 'suggested',
        age_range: { min_age: 3, max_age: 8 },
        duration: '45 minutes'
      };

      const { container } = renderWithProviders(
        <ActivityCard activity={mockActivity} onStatusChange={jest.fn()} />
      );

      const cardElement = container.querySelector('[data-testid="activity-card"]') || 
                          container.querySelector('.activity-card') ||
                          container.firstChild;
      
      expect(cardElement).toHaveStyle('padding: 16px');
      expect(cardElement).toHaveStyle('margin-bottom: 16px');
      
      // Verify text doesn't overflow
      const titleElement = screen.getByText(/test activity with a very long title/i);
      const titleStyles = window.getComputedStyle(titleElement);
      expect(titleStyles.overflow).not.toBe('visible');
    });
  });

  describe('Interactive Element States', () => {
    it('Buttons show correct hover and focus states', async () => {
      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity',
        status: 'suggested'
      };

      const { user } = renderWithProviders(
        <ActivityCard activity={mockActivity} onStatusChange={jest.fn()} />
      );

      const button = screen.getByRole('button', { name: /plan this/i });
      
      // Test focus state
      await user.tab();
      expect(button).toHaveFocus();
      expect(button).toHaveClass(/focus:ring/); // Assuming Tailwind focus classes
      
      // Test hover state
      await user.hover(button);
      expect(button).toHaveClass(/hover:bg/); // Assuming Tailwind hover classes
    });

    it('Form inputs show proper validation states', async () => {
      const AddChildForm = require('@/components/children/AddChildForm').default;
      const { user } = renderWithProviders(
        <AddChildForm onChildAdded={jest.fn()} onCancel={jest.fn()} />
      );

      const nameInput = screen.getByLabelText(/child's name/i);
      const submitButton = screen.getByRole('button', { name: /add child/i });
      
      // Trigger validation by submitting empty form
      await user.click(submitButton);
      
      // Check error state styling
      expect(nameInput).toHaveClass(/border-red/); // Error border
      expect(screen.getByText(/name is required/i)).toHaveClass(/text-red/); // Error text
    });
  });

  describe('Dark Mode Compatibility', () => {
    it('Components render correctly in dark mode', () => {
      // Mock dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      document.documentElement.classList.add('dark');

      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity',
        status: 'suggested'
      };

      const { container } = renderWithProviders(
        <ActivityCard activity={mockActivity} onStatusChange={jest.fn()} />
      );

      // Verify dark mode classes are applied
      expect(container.firstChild).toHaveClass(/dark:/); // Tailwind dark mode classes
    });
  });

  describe('Animation Integrity', () => {
    it('Animations complete without jank', async () => {
      const { user } = renderWithProviders(<Dashboard />);
      
      // Mock reduced motion preference initially disabled
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: no-preference)',
          media: query,
        })),
      });

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Look for animated elements
      const animatedElements = document.querySelectorAll('[data-animation]');
      animatedElements.forEach(element => {
        expect(element).not.toHaveClass('animate-none');
      });
    });

    it('Respects reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
        })),
      });

      document.documentElement.classList.add('reduced-motion');

      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity',
        status: 'suggested'
      };

      renderWithProviders(
        <ActivityCard activity={mockActivity} onStatusChange={jest.fn()} />
      );

      // Verify animations are disabled
      const animatedElements = document.querySelectorAll('[data-animation]');
      animatedElements.forEach(element => {
        expect(element).toHaveClass(/animate-none|duration-0/);
      });
    });
  });

  describe('Typography and Readability', () => {
    it('Maintains proper text contrast ratios', async () => {
      const { container } = renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Test with axe for color contrast
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true }
        }
      });

      expect(results).toHaveNoViolations();
    });

    it('Scales text appropriately for accessibility', () => {
      // Mock large text preference
      document.documentElement.style.fontSize = '20px'; // 125% of default 16px
      
      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity',
        description: 'Test description',
        status: 'suggested'
      };

      renderWithProviders(
        <ActivityCard activity={mockActivity} onStatusChange={jest.fn()} />
      );

      const title = screen.getByText('Test Activity');
      const computedStyle = window.getComputedStyle(title);
      
      // Verify text scales appropriately
      expect(parseFloat(computedStyle.fontSize)).toBeGreaterThan(16);
    });
  });

  describe('Content Overflow Handling', () => {
    it('Handles very long content gracefully', () => {
      const veryLongActivity = {
        id: 'activity-123',
        title: 'This is an extremely long activity title that should be handled gracefully without breaking the layout or causing horizontal scroll issues in the component',
        description: 'This is an extremely long description that contains way too much text for a normal activity description and should be truncated or wrapped properly to maintain the layout integrity of the component. '.repeat(5),
        status: 'suggested',
        materials_needed: Array(20).fill('Material with a very long name that might cause layout issues')
      };

      const { container } = renderWithProviders(
        <ActivityCard activity={veryLongActivity} onStatusChange={jest.fn()} />
      );

      // Check that container doesn't overflow
      const cardElement = container.firstChild;
      const computedStyle = window.getComputedStyle(cardElement);
      
      expect(computedStyle.overflow).not.toBe('visible');
      expect(computedStyle.wordWrap).toBe('break-word');
    });
  });

  describe('Loading State Consistency', () => {
    it('Shows consistent loading states across components', () => {
      const LoadingComponent = () => {
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          setTimeout(() => setLoading(false), 1000);
        }, []);
        
        if (loading) {
          return <div data-testid="loading">Loading...</div>;
        }
        
        return <div>Loaded content</div>;
      };

      renderWithProviders(<LoadingComponent />);
      
      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement).toBeInTheDocument();
      
      // Verify consistent loading state styling
      expect(loadingElement).toHaveClass(/animate-pulse|loading/);
    });
  });

  describe('Error State Display', () => {
    it('Shows user-friendly error messages', () => {
      const ErrorComponent = () => {
        const [error, setError] = React.useState(null);
        
        React.useEffect(() => {
          setError('Something went wrong while loading data');
        }, []);
        
        if (error) {
          return (
            <div role="alert" className="error-state">
              <h3>Oops! Something went wrong</h3>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
          );
        }
        
        return <div>Normal content</div>;
      };

      renderWithProviders(<ErrorComponent />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
