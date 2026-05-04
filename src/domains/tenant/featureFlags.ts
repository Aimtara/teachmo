import { graphqlRequest } from '@/lib/graphql';

export type FeatureFlags = Record<string, boolean>;

type TenantProfile = {
  organization_id: string | null;
  school_id: string | null;
};

type ProfileResponse = {
  profiles?: TenantProfile[];
};

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
};

type FeatureFlagsResponse = {
  feature_flags?: FeatureFlagRow[];
};

export async function getTenantFeatureFlagsForUser(userId: string | null): Promise<FeatureFlags> {
  if (!userId) return {};

  const profileQuery = `query MyProfile($userId: uuid!) {
    profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
      organization_id
      school_id
    }
  }`;
  const profileData = await graphqlRequest<ProfileResponse>({ query: profileQuery, variables: { userId } });
  const profile = profileData?.profiles?.[0];
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
  const flagData = await graphqlRequest<FeatureFlagsResponse>({
    query: flagsQuery,
    variables: { orgId: organizationId, schoolId },
  });

  return (flagData?.feature_flags ?? []).reduce<FeatureFlags>((acc, flag) => {
    acc[flag.key] = Boolean(flag.enabled);
    return acc;
  }, {});
}
