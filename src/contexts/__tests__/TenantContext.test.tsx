import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { fetchUserProfile } from '@/domains/auth';

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

vi.mock('@/domains/auth', () => ({
  fetchUserProfile: vi.fn(),
}));

const fetchUserProfileMock = vi.mocked(fetchUserProfile);

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
    fetchUserProfileMock.mockReset();
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

  it('clears tenant identifiers on auth transition when token is not yet available', async () => {
    // Start with a fully authenticated user so tenant state is populated.
    authState.isAuthenticated = true;
    authState.user = { id: 'u1', metadata: { organization_id: 'org_1' } };
    const payload = btoa(
      JSON.stringify({ 'https://hasura.io/jwt/claims': { 'x-hasura-organization-id': 'org_1' } })
    );
    authState.accessToken = `h.${payload}.s`;

    const { rerender } = render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('org').textContent).toBe('org_1');
    });

    // Simulate token lag during a user switch – token and user cleared before new token arrives.
    authState.accessToken = null;
    authState.user = null;

    rerender(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('org').textContent).toBe('none');
  });

  it('resolves tenant from token/user once access token exists', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u1', metadata: { organization_id: 'org_meta' } };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': { 'x-hasura-organization-id': 'org_claim' } }));
    authState.accessToken = `h.${payload}.s`;

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('org').textContent).toBe('org_meta');
    });
  });

  it('fills missing school id from profile fallback when organization is already known', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-partial', metadata: { organization_id: 'org_meta' } };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': {} }));
    authState.accessToken = `h.${payload}.s`;
    fetchUserProfileMock.mockResolvedValue({ organization_id: 'org_db', school_id: 'school_db' } as any);

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('org').textContent).toBe('org_meta');
    });

    expect(fetchUserProfileMock).toHaveBeenCalledWith('u-partial');
  });

  it('falls back to profile lookup when metadata and token claims are missing', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-fallback', metadata: {} };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': {} }));
    authState.accessToken = `h.${payload}.s`;
    fetchUserProfileMock.mockResolvedValue({ organization_id: 'org_db', school_id: 'school_db' } as any);

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('org').textContent).toBe('org_db');
    });

    expect(fetchUserProfileMock).toHaveBeenCalledWith('u-fallback');
  });
});
