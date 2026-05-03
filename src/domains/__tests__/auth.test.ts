import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserProfile } from '@/domains/auth';
import { graphqlRequest } from '@/lib/graphql';
import { GraphQLRequestError } from '@/lib/hasuraErrors';

vi.mock('@/lib/graphql', () => ({
  graphqlRequest: vi.fn(),
}));

const graphqlRequestMock = vi.mocked(graphqlRequest);

describe('fetchUserProfile', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset();
  });

  it('returns modern profiles row when available', async () => {
    graphqlRequestMock
      .mockResolvedValueOnce({
        profiles: [
          {
            id: 'p1',
            user_id: 'u1',
            full_name: 'User One',
            app_role: 'parent',
            organization_id: 'org1',
            school_id: 'school1',
          },
        ],
      });

    await expect(fetchUserProfile('u1')).resolves.toMatchObject({
      id: 'p1',
      user_id: 'u1',
      app_role: 'parent',
      organization_id: 'org1',
      school_id: 'school1',
    });

    expect(graphqlRequestMock).toHaveBeenCalledTimes(1);
  });



  it('does not hide unrecoverable auth errors behind legacy fallback', async () => {
    graphqlRequestMock.mockRejectedValueOnce(
      new GraphQLRequestError({
        kind: 'auth',
        message: 'jwt expired',
        code: 'invalid-jwt',
      })
    );

    await expect(fetchUserProfile('u3')).rejects.toBeInstanceOf(GraphQLRequestError);
    expect(graphqlRequestMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for recoverable profile lookup errors', async () => {
    graphqlRequestMock.mockRejectedValueOnce(new Error('permission denied for relation profiles'));

    await expect(fetchUserProfile('u2')).resolves.toBeNull();
    expect(graphqlRequestMock).toHaveBeenCalledTimes(1);
  });
});
