
/* global describe, test, expect, beforeEach, waitFor */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUser, mockChild, mockActivity, expectToastMessage } from './TestUtils';
import UnifiedDiscover from '@/pages/UnifiedDiscover';

describe('Activity Management', () => {
  beforeEach(() => {
    const userData = mockUser();
    const childrenData = [mockChild()];
    const activitiesData = [mockActivity(), mockActivity({ id: 'activity456', title: 'Science Experiment' })];
    
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    const { Child } = require('@/api/entities');
    Child.list.mockResolvedValue(childrenData);
    const { Activity } = require('@/api/entities');
    Activity.filter.mockResolvedValue(activitiesData);
  });

  test('displays list of available activities', async () => {
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText('Color Mixing Experiment')).toBeInTheDocument();
      expect(screen.getByText('Science Experiment')).toBeInTheDocument();
      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument();
    });
  });

  test('allows filtering activities by category', async () => {
    const creativeActivities = [mockActivity({ category: 'creative' })];
    const { Activity } = require('@/api/entities');
    Activity.filter.mockResolvedValue(creativeActivities);
    
    renderWithProviders(<UnifiedDiscover />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/activities/i)).toBeInTheDocument();
    });
    
    // Select creative category filter
    const categoryFilter = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(categoryFilter, { target: { value: 'creative' } });
    
    await waitFor(() => {
      expect(Activity.filter).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'creative'
        }),
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  test('allows filtering activities by age range', async () => {
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText(/activities/i)).toBeInTheDocument();
    });
    
    // Select age range filter
    const ageFilter = screen.getByRole('combobox', { name: /age/i });
    fireEvent.change(ageFilter, { target: { value: '5-8' } });
    
    await waitFor(() => {
      const { Activity } = require('@/api/entities');
      expect(Activity.filter).toHaveBeenCalledWith(
        expect.objectContaining({
          'age_range.min_age': { $lte: 8 },
          'age_range.max_age': { $gte: 5 }
        }),
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  test('shows activity details when clicked', async () => {
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText('Color Mixing Experiment')).toBeInTheDocument();
    });
    
    // Click on activity
    const activityCard = screen.getByText('Color Mixing Experiment');
    fireEvent.click(activityCard);
    
    // Should show detailed modal/view
    await waitFor(() => {
      expect(screen.getByText(/Learn about primary and secondary colors/i)).toBeInTheDocument();
      expect(screen.getByText(/Materials needed/i)).toBeInTheDocument();
      expect(screen.getByText('Paint')).toBeInTheDocument();
      expect(screen.getByText('Brushes')).toBeInTheDocument();
    });
  });

  test('allows marking activity as completed', async () => {
    const { Activity } = require('@/api/entities');
    Activity.update.mockResolvedValue({ success: true });
    
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText('Color Mixing Experiment')).toBeInTheDocument();
    });
    
    // Click complete button
    const completeButton = screen.getByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(Activity.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'completed',
          completion_date: expect.any(String)
        })
      );
    });
    
    await expectToastMessage(/activity completed/i);
  });

  test('allows rating completed activities', async () => {
    const completedActivity = mockActivity({ status: 'completed' });
    const { Activity } = require('@/api/entities');
    Activity.filter.mockResolvedValue([completedActivity]);
    Activity.update.mockResolvedValue({ success: true });
    
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText('Color Mixing Experiment')).toBeInTheDocument();
    });
    
    // Click rating stars
    const fiveStarButton = screen.getByRole('button', { name: /5 stars/i });
    fireEvent.click(fiveStarButton);
    
    await waitFor(() => {
      expect(Activity.update).toHaveBeenCalledWith(
        completedActivity.id,
        expect.objectContaining({
          rating: 5
        })
      );
    });
  });

  test('allows adding activities to calendar', async () => {
    const { CalendarEvent } = require('@/api/entities');
    CalendarEvent.create.mockResolvedValue({ success: true });
    
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText('Color Mixing Experiment')).toBeInTheDocument();
    });
    
    // Click schedule button
    const scheduleButton = screen.getByRole('button', { name: /schedule/i });
    fireEvent.click(scheduleButton);
    
    // Select date and time
    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '2024-12-25' } });
    
    const timeInput = screen.getByLabelText(/time/i);
    fireEvent.change(timeInput, { target: { value: '14:00' } });
    
    // Confirm scheduling
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(CalendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Color Mixing Experiment',
          start_time: expect.stringContaining('2024-12-25'),
          resource_type: 'activity'
        })
      );
    });
    
    await expectToastMessage(/activity scheduled/i);
  });

  test('handles empty activity list gracefully', async () => {
    const { Activity } = require('@/api/entities');
    Activity.filter.mockResolvedValue([]);
    
    renderWithProviders(<UnifiedDiscover />);
    
    await waitFor(() => {
      expect(screen.getByText(/no activities found/i)).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });
  });
});
