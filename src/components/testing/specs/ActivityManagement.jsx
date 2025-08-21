import '../jestGlobals';
import React from 'react';
import { renderWithProviders, screen, waitFor } from '../testUtils';
import ActivityCard from '@/components/activities/ActivityCard';
import { Activity } from '@/api/entities';
import { axe } from 'jest-axe';

jest.mock('@/api/entities');

describe('Activity Management', () => {
  const mockActivity = {
    id: 'activity-123',
    title: 'Build a Sandcastle',
    description: 'Create amazing sandcastles at the beach',
    category: 'creative',
    age_range: { min_age: 3, max_age: 8 },
    duration: '45 minutes',
    materials_needed: ['bucket', 'shovel', 'sand'],
    instructions: ['Fill bucket with sand', 'Turn over carefully', 'Decorate'],
    learning_objectives: ['creativity', 'fine motor skills'],
    status: 'suggested',
    is_personalized: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ActivityCard Component', () => {
    it('renders activity information correctly', () => {
      const onStatusChange = jest.fn();
      
      renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: mockActivity, 
          onStatusChange: onStatusChange 
        })
      );

      expect(screen.getByText('Build a Sandcastle')).toBeInTheDocument();
      expect(screen.getByText(/create amazing sandcastles/i)).toBeInTheDocument();
      expect(screen.getByText('45 minutes')).toBeInTheDocument();
      expect(screen.getByText('Ages 3-8')).toBeInTheDocument();
    });

    it('displays correct status badge', () => {
      const onStatusChange = jest.fn();
      
      renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: mockActivity, 
          onStatusChange: onStatusChange 
        })
      );

      expect(screen.getByText('Suggested')).toBeInTheDocument();
    });

    it('shows materials needed when expanded', async () => {
      const onStatusChange = jest.fn();
      const { user } = renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: mockActivity, 
          onStatusChange: onStatusChange 
        })
      );

      // Look for expand/details button
      const detailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(detailsButton);

      expect(screen.getByText('Materials Needed:')).toBeInTheDocument();
      expect(screen.getByText('bucket')).toBeInTheDocument();
      expect(screen.getByText('shovel')).toBeInTheDocument();
      expect(screen.getByText('sand')).toBeInTheDocument();
    });

    it('handles status change when plan button is clicked', async () => {
      const onStatusChange = jest.fn();
      Activity.update.mockResolvedValue({ ...mockActivity, status: 'planned' });

      const { user } = renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: mockActivity, 
          onStatusChange: onStatusChange 
        })
      );

      const planButton = screen.getByRole('button', { name: /plan this/i });
      await user.click(planButton);

      expect(Activity.update).toHaveBeenCalledWith(mockActivity.id, {
        ...mockActivity,
        status: 'planned'
      });
      
      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(mockActivity.id, 'planned');
      });
    });

    it('handles completion marking', async () => {
      const completedActivity = { ...mockActivity, status: 'planned' };
      const onStatusChange = jest.fn();
      Activity.update.mockResolvedValue({ ...completedActivity, status: 'completed' });

      const { user } = renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: completedActivity, 
          onStatusChange: onStatusChange 
        })
      );

      const completeButton = screen.getByRole('button', { name: /mark complete/i });
      await user.click(completeButton);

      expect(Activity.update).toHaveBeenCalledWith(completedActivity.id, {
        ...completedActivity,
        status: 'completed',
        completion_date: expect.any(String)
      });
      
      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(completedActivity.id, 'completed');
      });
    });

    it('displays personalized badge for AI-generated activities', () => {
      const personalizedActivity = { ...mockActivity, is_personalized: true };
      const onStatusChange = jest.fn();
      
      renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: personalizedActivity, 
          onStatusChange: onStatusChange 
        })
      );

      expect(screen.getByText('Personalized')).toBeInTheDocument();
    });
  });

  describe('Activity Status Management', () => {
    it('filters activities by status correctly', async () => {
      Activity.filter.mockResolvedValue([
        { ...mockActivity, status: 'planned' },
      ]);

      const ActivityList = () => {
        const [activities, setActivities] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          Activity.filter({ status: 'planned' })
            .then(setActivities)
            .finally(() => setLoading(false));
        }, []);

        if (loading) return React.createElement('div', null, 'Loading activities...');

        return React.createElement('div', null,
          React.createElement('h2', null, `Planned Activities (${activities.length})`),
          ...activities.map(activity => 
            React.createElement('div', { key: activity.id }, activity.title)
          )
        );
      };

      renderWithProviders(React.createElement(ActivityList));
      
      expect(screen.getByText('Loading activities...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Planned Activities (1)')).toBeInTheDocument();
        expect(screen.getByText('Build a Sandcastle')).toBeInTheDocument();
      });

      expect(Activity.filter).toHaveBeenCalledWith({ status: 'planned' });
    });
  });

  describe('Accessibility', () => {
    it('ActivityCard has no accessibility violations', async () => {
      const onStatusChange = jest.fn();
      const { container } = renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: mockActivity, 
          onStatusChange: onStatusChange 
        })
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper button labels for screen readers', () => {
      const onStatusChange = jest.fn();
      renderWithProviders(
        React.createElement(ActivityCard, { 
          activity: mockActivity, 
          onStatusChange: onStatusChange 
        })
      );

      const planButton = screen.getByRole('button', { name: /plan this activity/i });
      expect(planButton).toHaveAttribute('aria-label');
    });
  });
});