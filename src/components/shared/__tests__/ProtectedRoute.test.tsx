import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

let authState = { isAuthenticated: false, isLoading: false };
let roleState = { role: 'parent', roleSource: 'jwt', loading: false, needsOnboarding: false };

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => authState,
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRoleState: () => roleState,
}));

function renderGuard(allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute production-like behavior', () => {
  beforeEach(() => {
    authState = { isAuthenticated: false, isLoading: false };
    roleState = { role: 'parent', roleSource: 'jwt', loading: false, needsOnboarding: false };
  });

  it('redirects unauthenticated users to login', () => {
    renderGuard();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('blocks authenticated users without an allowed role', () => {
    authState = { isAuthenticated: true, isLoading: false };
    roleState = { role: 'parent', roleSource: 'jwt', loading: false, needsOnboarding: false };
    renderGuard(['system_admin']);
    expect(screen.getByText('Unauthorized page')).toBeInTheDocument();
  });

  it('allows system_admin users into system admin routes', () => {
    authState = { isAuthenticated: true, isLoading: false };
    roleState = { role: 'system_admin', roleSource: 'jwt', loading: false, needsOnboarding: false };
    renderGuard(['system_admin']);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
