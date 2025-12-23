
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Added this import
import { renderWithProviders, createMockActivity, testUtils } from '../testing/testUtils';
import ActivityCard from '../activities/ActivityCard';

describe('ActivityCard Component', () => {
  const mockActivity = createMockActivity({
    title: 'Painting Fun',
    description: 'Create colorful artwork',
    category: 'creative',
    duration: '45 minutes',
    materials_needed: ['paint', 'brushes', 'paper'],
    age_range: { min_age: 4, max_age: 8 }
  });

  it('renders activity information correctly', () => {
    renderWithProviders(
      <ActivityCard 
        activity={mockActivity}
        onSelect={jest.fn()}
        onSchedule={jest.fn()}
      />
    );

    expect(screen.getByText('Painting Fun')).toBeInTheDocument();
    expect(screen.getByText('Create colorful artwork')).toBeInTheDocument();
    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('Ages 4-8')).toBeInTheDocument();
  });

  it('displays materials needed', () => {
    renderWithProviders(
      <ActivityCard 
        activity={mockActivity}
        onSelect={jest.fn()}
        onSchedule={jest.fn()}
      />
    );

    expect(screen.getByText(/paint/i)).toBeInTheDocument();
    expect(screen.getByText(/brushes/i)).toBeInTheDocument();
    expect(screen.getByText(/paper/i)).toBeInTheDocument();
  });

  it('handles interaction callbacks', async () => {
    const mockOnSelect = jest.fn();
    const mockOnSchedule = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ActivityCard 
        activity={mockActivity}
        onSelect={mockOnSelect}
        onSchedule={mockOnSchedule}
      />
    );

    const selectButton = screen.getByRole('button', { name: /select/i });
    await user.click(selectButton);
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockActivity);
  });

  it('shows category badge with correct styling', () => {
    renderWithProviders(
      <ActivityCard 
        activity={mockActivity}
        onSelect={jest.fn()}
        onSchedule={jest.fn()}
      />
    );

    const categoryBadge = screen.getByText('creative');
    expect(categoryBadge).toHaveClass('badge');
  });

  it('handles premium activities correctly', () => {
    const premiumActivity = createMockActivity({
      ...mockActivity,
      is_premium: true
    });

    renderWithProviders(
      <ActivityCard 
        activity={premiumActivity}
        onSelect={jest.fn()}
        onSchedule={jest.fn()}
      />
    );

    expect(screen.getByText(/premium/i)).toBeInTheDocument();
  });

  it('displays completion status for completed activities', () => {
    const completedActivity = createMockActivity({
      ...mockActivity,
      status: 'completed',
      rating: 5
    });

    renderWithProviders(
      <ActivityCard 
        activity={completedActivity}
        onSelect={jest.fn()}
        onSchedule={jest.fn()}
      />
    );

    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });
});
