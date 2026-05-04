import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getTenantSsoSettings } from '@/domains/tenant/ssoSettings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const scopeState = {
  data: { organizationId: 'org-1', districtId: null },
};

vi.mock('@/hooks/useTenantScope', () => ({
  useTenantScope: () => scopeState,
}));

vi.mock('@/domains/tenant/ssoSettings', () => ({
  getTenantSsoSettings: vi.fn(),
}));

const getTenantSSOSettingsMock = vi.mocked(getTenantSsoSettings);

const { default: useTenantSSOSettings } = await import('@/hooks/useTenantSSOSettings');


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
    getTenantSSOSettingsMock.mockReset();
    scopeState.data = { organizationId: 'org-1', districtId: null };
  });

  it('reads providers and requireSso from organization_id tenant settings', async () => {
    getTenantSSOSettingsMock.mockResolvedValue({
      providers: ['google', 'entraid'],
      requireSso: true,
    });

    const { result } = renderHook(() => useTenantSSOSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      providers: ['google', 'entraid'],
      requireSso: true,
    });
    expect(getTenantSSOSettingsMock).toHaveBeenCalledWith('org-1');
  });

  it('uses district_id scope when organization_id is unavailable', async () => {
    scopeState.data = { organizationId: null, districtId: 'district-1' };
    getTenantSSOSettingsMock.mockResolvedValue({
      providers: ['azuread'],
      requireSso: true,
    });

    const { result } = renderHook(() => useTenantSSOSettings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getTenantSSOSettingsMock).toHaveBeenCalledWith('district-1');
    expect(result.current.data).toEqual({ providers: ['azuread'], requireSso: true });
  });
});
