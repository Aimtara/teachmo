
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUser, expectToastMessage } from './TestUtils';
import Layout from '../layout';

describe('User Authentication', () => {
  test('redirects unauthenticated users to landing page', async () => {
    // Mock unauthenticated user
    const { User } = require('@/api/entities');
    User.me.mockRejectedValue(new Error('Unauthorized'));
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Dashboard Content</div></Layout>);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/Landing');
    });
  });

  test('displays authenticated user information in layout', async () => {
    const userData = mockUser();
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Dashboard Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText(userData.full_name)).toBeInTheDocument();
      expect(screen.getByText(/🔥 5/)).toBeInTheDocument(); // Login streak
    });
  });

  test('handles logout functionality', async () => {
    const userData = mockUser();
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(userData);
    User.logout.mockResolvedValue({ success: true });
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Dashboard Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText(userData.full_name)).toBeInTheDocument();
    });
    
    // Click user dropdown
    const userButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(userButton);
    
    // Click logout
    const logoutButton = screen.getByText(/sign out/i);
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(User.logout).toHaveBeenCalled();
    });
  });

  test('displays appropriate role-based navigation', async () => {
    // Test parent role
    const parentUser = mockUser({ role: 'parent' });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(parentUser);
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText('Activities')).toBeInTheDocument();
      expect(screen.getByText('AI Coach')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Test teacher role
    const teacherUser = mockUser({ role: 'teacher' });
    User.me.mockResolvedValue(teacherUser);
    
    renderWithProviders(<Layout currentPageName="TeacherDashboard"><div>Teacher Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText('My Classes')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
  });

  test('handles session expiry gracefully', async () => {
    const userData = mockUser();
    const { User } = require('@/api/entities');
    User.me
      .mockResolvedValueOnce(userData) // First load succeeds
      .mockRejectedValueOnce(new Error('Session expired')); // Periodic check fails
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Dashboard Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText(userData.full_name)).toBeInTheDocument();
    });
    
    // Simulate session expiry check (this would normally happen via interval)
    // For testing, we'll manually trigger the auth error state
    User.me.mockRejectedValue(new Error('Unauthorized'));
    
    // Re-render to trigger auth check
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Dashboard Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
    });
  });

  test('handles network errors during authentication', async () => {
    const { User } = require('@/api/entities');
    User.me.mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Dashboard Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText(/connection issue/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  test('shows premium badge for premium users', async () => {
    const premiumUser = mockUser({ subscription_tier: 'premium' });
    const { User } = require('@/api/entities');
    User.me.mockResolvedValue(premiumUser);
    
    renderWithProviders(<Layout currentPageName="Dashboard"><div>Content</div></Layout>);
    
    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });
});
