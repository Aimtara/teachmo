import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTenantScope } from '@/hooks/useTenantScope';
import { graphql } from '@/lib/graphql';
import { GraphQLRequestError } from '@/lib/hasuraErrors';

vi.mock('@nhost/react', () => ({
  useUserId: () => 'u1',
}));

vi.mock('@/lib/graphql', () => ({
  graphql: vi.fn(),
}));

const graphqlMock = vi.mocked(graphql);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useTenantScope', () => {
  beforeEach(() => {
    graphqlMock.mockReset();
  });

  it('uses legacy profile data when modern profiles query fails', async () => {
    graphqlMock
      .mockRejectedValueOnce(new Error('permission denied for relation profiles'))
      .mockResolvedValueOnce({
        user_profiles_by_pk: {
          user_id: 'u1',
          full_name: 'Legacy Parent',
          role: 'parent',
          district_id: 'org1',
          school_id: 'school1',
        },
      });

    const { result } = renderHook(() => useTenantScope(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      userId: 'u1',
      profileId: null,
      fullName: 'Legacy Parent',
      role: 'parent',
      organizationId: null,
      districtId: 'org1',
      schoolId: 'school1',
    });
  });



  it('surfaces unrecoverable auth errors immediately', async () => {
    graphqlMock.mockRejectedValueOnce(
      new GraphQLRequestError({ kind: 'auth', message: 'jwt expired', code: 'invalid-jwt' })
    );

    const { result } = renderHook(() => useTenantScope(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(graphqlMock).toHaveBeenCalledTimes(1);
  });

  it('errors when both modern and legacy queries fail', async () => {
    graphqlMock
      .mockRejectedValueOnce(new Error('profiles unavailable'))
      .mockRejectedValueOnce(new Error('legacy profile unavailable'));

    const { result } = renderHook(() => useTenantScope(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
