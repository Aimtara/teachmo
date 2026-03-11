import React from 'react';
import { render, screen } from '@testing-library/react';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';

const authState = {
  isLoading: false,
  isAuthenticated: false,
  user: null as any,
  accessToken: null as string | null,
};

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => ({ isLoading: authState.isLoading, isAuthenticated: authState.isAuthenticated }),
  useUserData: () => authState.user,
  useAccessToken: () => authState.accessToken,
}));

function Consumer() {
  const tenant = useTenant();
  return (
    <div>
      <span data-testid="loading">{String(tenant.loading)}</span>
      <span data-testid="org">{tenant.organizationId ?? 'none'}</span>
    </div>
  );
}

describe('TenantProvider', () => {
  beforeEach(() => {
    authState.isLoading = false;
    authState.isAuthenticated = false;
    authState.user = null;
    authState.accessToken = null;
  });

  it('keeps loading true when authenticated but token is not ready (token lag)', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u1', metadata: { organization_id: 'org_1' } };
    authState.accessToken = null;

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('org').textContent).toBe('none');
  });

  it('resolves tenant from token/user once access token exists', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u1', metadata: { organization_id: 'org_meta' } };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': { 'x-hasura-organization-id': 'org_claim' } }));
    authState.accessToken = `h.${payload}.s`;

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('org').textContent).toBe('org_meta');
  });
});
