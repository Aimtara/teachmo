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

  it('returns null when recoverable profile lookup errors occur', async () => {
    graphqlMock.mockRejectedValueOnce(new Error('permission denied for relation profiles'));

    const { result } = renderHook(() => useTenantScope(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
    expect(graphqlMock).toHaveBeenCalledTimes(1);
  });


  it('surfaces unrecoverable auth errors immediately', async () => {
    graphqlMock.mockRejectedValueOnce(
      new GraphQLRequestError({ kind: 'auth', message: 'jwt expired', code: 'invalid-jwt' })
    );

    const { result } = renderHook(() => useTenantScope(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(graphqlMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when modern profiles query has no rows', async () => {
    graphqlMock.mockResolvedValueOnce({ profiles: [] });

    const { result } = renderHook(() => useTenantScope(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
