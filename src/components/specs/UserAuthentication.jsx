import '../jestGlobals';
import React from 'react';
import { renderWithProviders, screen, waitFor } from '../testing/testUtils';
import { User } from '@/api/entities';
import { axe } from 'jest-axe';

// Mock the User entity
jest.mock('@/api/entities', () => ({
  User: {
    me: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

describe('User Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication State Management', () => {
    it('handles unauthenticated state correctly', async () => {
      User.me.mockRejectedValue(new Error('Not authenticated'));
      
      const TestComponent = () => {
        const [user, setUser] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          User.me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
        }, []);
        
        if (loading) return React.createElement('div', null, 'Loading...');
        if (!user) return React.createElement('div', null, 'Please log in');
        return React.createElement('div', null, `Welcome, ${user.full_name}!`);
      };

      renderWithProviders(React.createElement(TestComponent));
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Please log in')).toBeInTheDocument();
      });
    });

    it('handles authenticated state correctly', async () => {
      const mockUser = {
        id: 'user-123',
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        user_type: 'parent'
      };
      
      User.me.mockResolvedValue(mockUser);
      
      const TestComponent = () => {
        const [user, setUser] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          User.me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
        }, []);
        
        if (loading) return React.createElement('div', null, 'Loading...');
        if (!user) return React.createElement('div', null, 'Please log in');
        return React.createElement('div', null, `Welcome, ${user.full_name}!`);
      };

      renderWithProviders(React.createElement(TestComponent));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
      });
    });

    it('handles logout functionality', async () => {
      User.logout.mockResolvedValue();
      
      const TestComponent = () => {
        const [user, setUser] = React.useState({ full_name: 'John Doe' });
        
        const handleLogout = async () => {
          await User.logout();
          setUser(null);
        };
        
        if (!user) return React.createElement('div', null, 'Logged out successfully');
        return React.createElement('div', null, 
          React.createElement('span', null, `Welcome, ${user.full_name}!`),
          React.createElement('button', { onClick: handleLogout }, 'Logout')
        );
      };

      const { user } = renderWithProviders(React.createElement(TestComponent));
      
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /logout/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Logged out successfully')).toBeInTheDocument();
      });
      
      expect(User.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login Process', () => {
    it('handles successful login', async () => {
      const mockUser = {
        id: 'user-123',
        full_name: 'Jane Smith',
        email: 'jane@example.com'
      };
      
      User.login.mockResolvedValue(mockUser);
      
      const LoginComponent = () => {
        const [user, setUser] = React.useState(null);
        const [loading, setLoading] = React.useState(false);
        
        const handleLogin = async () => {
          setLoading(true);
          try {
            const loggedInUser = await User.login();
            setUser(loggedInUser);
          } catch (error) {
            console.error('Login failed:', error);
          } finally {
            setLoading(false);
          }
        };
        
        if (user) return React.createElement('div', null, `Welcome, ${user.full_name}!`);
        
        return React.createElement('div', null,
          React.createElement('button', { 
            onClick: handleLogin, 
            disabled: loading 
          }, loading ? 'Logging in...' : 'Login with Google')
        );
      };

      const { user } = renderWithProviders(React.createElement(LoginComponent));
      
      const loginButton = screen.getByRole('button', { name: /login with google/i });
      await user.click(loginButton);
      
      expect(screen.getByText('Logging in...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, Jane Smith!')).toBeInTheDocument();
      });
      
      expect(User.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('login flow has no accessibility violations', async () => {
      const LoginForm = () => React.createElement('form', { 'aria-label': 'Login form' },
        React.createElement('h1', null, 'Sign In'),
        React.createElement('button', { 
          type: 'button', 
          'aria-label': 'Sign in with Google' 
        }, 'Login with Google')
      );

      const { container } = renderWithProviders(React.createElement(LoginForm));
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
