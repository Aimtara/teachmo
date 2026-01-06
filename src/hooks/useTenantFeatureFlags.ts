import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@nhost/react';
import { graphqlRequest } from '@/lib/graphql';

type FeatureFlags = Record<string, boolean>;

type TenantProfile = {
  organization_id: string | null;
  school_id: string | null;
};

export function useTenantFeatureFlags() {
  const authUser = useUserData();
  const userId = authUser?.id ?? null;

  return useQuery({
    queryKey: ['tenant-feature-flags', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FeatureFlags> => {
      if (!userId) return {};
      const profileQuery = `query MyProfile($userId: uuid!) {
        profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
          organization_id
          school_id
        }
      }`;
      const profileData = await graphqlRequest({ query: profileQuery, variables: { userId } });
      const profile: TenantProfile | undefined = profileData?.profiles?.[0];
      const organizationId = profile?.organization_id ?? null;
      const schoolId = profile?.school_id ?? null;

      if (!organizationId) return {};

      const flagsQuery = `query TenantFeatureFlags($orgId: uuid!, $schoolId: uuid) {
        feature_flags(
          where: {
            organization_id: { _eq: $orgId },
            _or: [
              { school_id: { _eq: $schoolId } },
              { school_id: { _is_null: true } }
            ]
          }
        ) {
          key
          enabled
        }
      }`;
      const flagData = await graphqlRequest({
        query: flagsQuery,
        variables: { orgId: organizationId, schoolId },
      });
      const flags = (flagData?.feature_flags ?? []).reduce((acc: FeatureFlags, flag: { key: string; enabled: boolean }) => {
        acc[flag.key] = Boolean(flag.enabled);
        return acc;
      }, {} as FeatureFlags);
      if (typeof globalThis !== 'undefined') {
        // @ts-ignore
        globalThis.__teachmoFeatureFlags = {
          // @ts-ignore
          ...(globalThis.__teachmoFeatureFlags || {}),
          ...flags,
        };
      }
      return flags;
    },
  });
}
