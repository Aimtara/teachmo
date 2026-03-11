import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { fetchUserProfile } from '@/domains/auth';
import { GraphQLRequestError } from '@/lib/hasuraErrors';

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


const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}));

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      signOut: signOutMock,
    },
  },
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
    fetchUserProfileMock.mockReset();
    signOutMock.mockReset();
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

  it('stops loading when profile fallback fails with unauthorized error', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-unauthorized', metadata: {} };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': {} }));
    authState.accessToken = `h.${payload}.s`;
    const unauthorizedError = Object.assign(new Error('GraphQL unauthorized'), {
      name: 'GraphQLRequestError',
      normalized: {
        kind: 'auth',
        code: 'UNAUTHENTICATED',
      },
    });
    fetchUserProfileMock.mockRejectedValue(unauthorizedError as any);

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('org').textContent).toBe('none');
    });

    expect(fetchUserProfileMock).toHaveBeenCalledWith('u-unauthorized');
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('calls signOut only once when the unauthorized fallback is triggered multiple times in the same session', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-unauth-guard', metadata: {} };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': {} }));
    authState.accessToken = `h.${payload}.s`;
    const unauthorizedError = Object.assign(new Error('GraphQL unauthorized'), {
      name: 'GraphQLRequestError',
      normalized: {
        kind: 'authorization',
        code: 'UNAUTHENTICATED',
      },
    });
    fetchUserProfileMock.mockRejectedValue(unauthorizedError as any);

    const { rerender } = render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    // Wait for the first sign-out to complete.
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });

    // Change the user object reference while keeping the same user.id and accessToken.
    // This causes the main tenant-resolution effect to re-run (user reference changed)
    // but does NOT reset the unauthorizedRecoveryAttemptedRef guard (user.id unchanged).
    authState.user = { id: 'u-unauth-guard', metadata: {} };

    rerender(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // The guard must prevent a second sign-out call.
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('does not force sign-out for non-auth fallback errors', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u-network', metadata: {} };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': {} }));
    authState.accessToken = `h.${payload}.s`;
    fetchUserProfileMock.mockRejectedValue(new GraphQLRequestError({ kind: 'network', message: 'network timeout' }));

    render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('org').textContent).toBe('none');
    });

    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('does not force sign-out when the effect has been cleaned up before unauthorized error resolves', async () => {
    // Simulate a stale effect invocation: the component unmounts before the
    // async fetchUserProfile rejects, so mounted is false at rejection time.
    let rejectProfile!: (err: Error) => void;
    fetchUserProfileMock.mockImplementation(
      () => new Promise<never>((_, reject) => { rejectProfile = reject; })
    );

    authState.isAuthenticated = true;
    authState.user = { id: 'u-stale', metadata: {} };
    const payload = btoa(JSON.stringify({ 'https://hasura.io/jwt/claims': {} }));
    authState.accessToken = `h.${payload}.s`;

    const { unmount } = render(
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    );

    // Unmount (cleanup) before the async operation settles — sets mounted=false.
    unmount();

    // Now reject with an unauthorized error; should not trigger signOut.
    rejectProfile(new Error('GraphQL request failed: 401 Unauthorized'));

    // Allow any pending microtasks to flush.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(signOutMock).not.toHaveBeenCalled();
  });

});
