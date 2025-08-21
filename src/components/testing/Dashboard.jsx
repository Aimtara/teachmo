
/* global describe, test, expect, beforeEach */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import Dashboard from '@/pages/Dashboard';
import { 
  renderWithProviders, 
  mockUser, 
  mockChild, 
  mockActivity, 
  mockParentingTip,
  waitForLoadingToFinish,
  createMockEntityMethods 
} from './TestUtils';

// Mock the entities with sample data
const mockUserData = mockUser();
const mockChildrenData = [mockChild(), mockChild({ id: 'child456', name: 'Second Child', age: 5 })];
const mockActivitiesData = [mockActivity(), mockActivity({ id: 'activity456', title: 'Math Puzzles' })];
const mockTipsData = [mockParentingTip()];

// Setup mocks before tests
beforeEach(() => {
  // Mock User entity
  const { User } = require('@/api/entities');
  User.me.mockResolvedValue(mockUserData);
  
  // Mock Child entity
  const { Child } = require('@/api/entities');
  Child.list.mockResolvedValue(mockChildrenData);
  
  // Mock Activity entity
  const { Activity } = require('@/api/entities');
  Activity.filter.mockResolvedValue(mockActivitiesData);
  
  // Mock ParentingTip entity
  const { ParentingTip } = require('@/api/entities');
  ParentingTip.list.mockResolvedValue(mockTipsData);
});

describe('Dashboard Page', () => {
  test('renders dashboard with user welcome message', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitForLoadingToFinish();
    
    // Check for welcome message
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(mockUserData.full_name)).toBeInTheDocument();
  });

  test('displays login streak information', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitForLoadingToFinish();
    
    // Check for streak display
    expect(screen.getByText(/5 days/i)).toBeInTheDocument();
    expect(screen.getByText(/streak/i)).toBeInTheDocument();
  });

  test('shows children overview section', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitForLoadingToFinish();
    
    // Check for children section
    expect(screen.getByText('Test Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
    expect(screen.getByText(/7 years old/i)).toBeInTheDocument();
  });

  test('displays suggested activities', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitForLoadingToFinish();
    
    // Check for activities section
    expect(screen.getByText('Color Mixing Experiment')).toBeInTheDocument();
    expect(screen.getByText('Math Puzzles')).toBeInTheDocument();
  });

  test('shows daily parenting tip', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitForLoadingToFinish();
    
    // Check for tip section
    expect(screen.getByText('Encouraging Creative Expression')).toBeInTheDocument();
    expect(screen.getByText(/foster your child's creativity/i)).toBeInTheDocument();
  });

  test('handles loading state properly', async () => {
    // Mock delayed responses
    const { User } = require('@/api/entities');
    User.me.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockUserData), 100))
    );
    
    renderWithProviders(<Dashboard />);
    
    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for loading to finish
    await waitForLoadingToFinish();
    
    // Should show content after loading
    expect(screen.getByText(mockUserData.full_name)).toBeInTheDocument();
  });

  test('handles error state when user data fails to load', async () => {
    // Mock error response
    const { User } = require('@/api/entities');
    User.me.mockRejectedValue(new Error('Failed to load user'));
    
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  test('displays points and gamification elements', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitForLoadingToFinish();
    
    // Check for points display
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText(/points/i)).toBeInTheDocument();
  });

  test('shows appropriate content for premium vs free users', async () => {
    // Test free user
    renderWithProviders(<Dashboard />);
    await waitForLoadingToFinish();
    
    expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
    
    // Test premium user
    const premiumUser = mockUser({ subscription_tier: 'premium' });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(premiumUser);
    
    renderWithProviders(<Dashboard />);
    await waitForLoadingToFinish();
    
    expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument();
  });
});
