import { useQuery } from '@tanstack/react-query';
import { useUserId } from '@nhost/react';
import { graphql } from '@/lib/graphql';
import { isRecoverableProfileLookupError } from '@/lib/hasuraErrors';

export type TenantScope = {
  userId: string;
  profileId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  districtId?: string | null;
  schoolId?: string | null;
  fullName?: string | null;
};

type ProfilesData = {
  profiles?: Array<{
    id: string;
    user_id: string;
    full_name: string;
    app_role: string;
    organization_id: string;
    school_id: string;
  }>;
};

type LegacyProfileData = {
  user_profiles_by_pk?: {
    user_id: string;
    full_name: string;
    role: string;
    district_id: string;
    school_id: string;
  } | null;
};

export function useTenantScope() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['tenant-scope', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TenantScope | null> => {
      if (!userId) return null;

      let profilesData: ProfilesData | null = null;
      let legacyData: LegacyProfileData | null = null;

      try {
        profilesData = await graphql<ProfilesData>(
          `query TenantScopeProfiles($userId: uuid!) {
            profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
              id
              user_id
              full_name
              app_role
              organization_id
              school_id
            }
          }`,
          { userId }
        );
      } catch (error) {
        if (!isRecoverableProfileLookupError(error)) {
          throw error;
        }
      }

      const profile = profilesData?.profiles?.[0] ?? null;

      // Only fall back to the legacy profile lookup when the modern profile
      // query fails or returns no rows, to avoid an extra network round-trip
      // and unnecessary permission errors.
      if (!profile) {
        try {
          legacyData = await graphql<LegacyProfileData>(
            `query TenantScopeLegacyProfile($userId: uuid!) {
              user_profiles_by_pk(user_id: $userId) {
                user_id
                full_name
                role
                district_id
                school_id
              }
            }`,
            { userId }
          );
        } catch (error) {
          if (!isRecoverableProfileLookupError(error)) {
            throw error;
          }
        }
      }

      const legacyProfile = legacyData?.user_profiles_by_pk ?? null;

      // If both profile lookups fail (both queries error), propagate an error to avoid silently
      // reporting a completed load with missing tenant scope.
      if (!profile && !legacyProfile && profilesData === null && legacyData === null) {
        throw new Error('tenant_scope_unavailable');
      }

      return {
        userId,
        profileId: profile?.id ?? null,
        fullName: profile?.full_name ?? legacyProfile?.full_name ?? null,
        role: profile?.app_role ?? legacyProfile?.role ?? null,
        organizationId: profile?.organization_id ?? null,
        districtId: legacyProfile?.district_id ?? null,
        schoolId: profile?.school_id ?? legacyProfile?.school_id ?? null,
      };
    },
  });
}
