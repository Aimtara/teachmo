import { describe, expect, it, vi, beforeEach } from 'vitest';

const requestMock = vi.fn();

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    graphql: {
      request: requestMock,
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('graphqlRequest', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('accepts object arguments', async () => {
    requestMock.mockResolvedValue({ data: { ok: true }, error: null });
    const { graphqlRequest } = await import('@/lib/graphql');

    const result = await graphqlRequest({ query: 'query { ok }', variables: { id: '1' } });

    expect(result).toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledWith('query { ok }', { id: '1' }, {});
  });

  it('accepts legacy positional arguments', async () => {
    requestMock.mockResolvedValue({ data: { ok: true }, error: null });
    const { graphqlRequest } = await import('@/lib/graphql');

    const result = await graphqlRequest('query { ok }', { id: '2' }, { 'x-test': '1' });

    expect(result).toEqual({ ok: true });
    expect(requestMock).toHaveBeenCalledWith('query { ok }', { id: '2' }, { 'x-test': '1' });
  });
});
