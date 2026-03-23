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


export function useTenantScope() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['tenant-scope', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TenantScope | null> => {
      if (!userId) return null;

      let profilesData: ProfilesData | null = null;

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
        return null;
      }

      const profile = profilesData?.profiles?.[0] ?? null;

      if (!profile) {
        return null;
      }

      return {
        userId,
        profileId: profile.id,
        fullName: profile.full_name ?? null,
        role: profile.app_role ?? null,
        organizationId: profile.organization_id ?? null,
        districtId: null,
        schoolId: profile.school_id ?? null,
      };
    },
  });
}
