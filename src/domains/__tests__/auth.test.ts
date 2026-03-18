import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserProfile } from '@/domains/auth';
import { graphqlRequest } from '@/lib/graphql';

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

  it('falls back to legacy user_profiles when profiles query fails', async () => {
    graphqlRequestMock
      .mockRejectedValueOnce(new Error('permission denied for relation profiles'))
      .mockResolvedValueOnce({
        user_profiles_by_pk: {
          user_id: 'u2',
          full_name: 'Legacy User',
          role: 'parent',
          district_id: 'org2',
          school_id: 'school2',
        },
      });

    await expect(fetchUserProfile('u2')).resolves.toMatchObject({
      id: 'u2',
      user_id: 'u2',
      app_role: 'parent',
      organization_id: 'org2',
      school_id: 'school2',
    });

    expect(graphqlRequestMock).toHaveBeenCalledTimes(2);
  });
});
