import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useTenantSSOSettings from '@/hooks/useTenantSSOSettings';
import { graphqlRequest } from '@/lib/graphql';

const scopeState = {
  data: { organizationId: 'org-1', districtId: null },
};

vi.mock('@/hooks/useTenantScope', () => ({
  useTenantScope: () => scopeState,
}));

vi.mock('@/lib/graphql', () => ({
  graphqlRequest: vi.fn(),
}));

const graphqlRequestMock = vi.mocked(graphqlRequest);


function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTenantSSOSettings', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset();
    scopeState.data = { organizationId: 'org-1', districtId: null };
  });

  it('reads providers and requireSso from organization_id tenant settings', async () => {
    graphqlRequestMock.mockResolvedValue({
      enterprise_sso_settings: [{ provider: 'google' }, { provider: 'entraid' }],
      tenant_settings: [{ settings: { require_sso: true } }],
    } as any);

    const { result } = renderHook(() => useTenantSSOSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      providers: ['google', 'entraid'],
      requireSso: true,
    });
  });

  it('falls back to legacy district_id query when organization_id field is unavailable', async () => {
    graphqlRequestMock
      .mockRejectedValueOnce(new Error('field "organization_id" does not exist in type: tenant_settings_bool_exp'))
      .mockResolvedValueOnce({
        enterprise_sso_settings: [{ provider: 'azuread' }],
        tenant_settings: [{ settings: { requireSso: true } }],
      } as any);

    const { result } = renderHook(() => useTenantSSOSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(graphqlRequestMock).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ providers: ['azuread'], requireSso: true });
  });
});
