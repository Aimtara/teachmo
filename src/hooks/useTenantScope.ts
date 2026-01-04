import { useQuery } from '@tanstack/react-query';
import { useUserId } from '@nhost/react';
import { graphql } from '@/lib/graphql';

export type TenantScope = {
  userId: string;
  profileId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  districtId?: string | null;
  schoolId?: string | null;
  fullName?: string | null;
};

export function useTenantScope() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['tenant-scope', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TenantScope | null> => {
      if (!userId) return null;

      const data = await graphql(
        `query TenantScope($userId: uuid!) {
          profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
            id
            user_id
            full_name
            app_role
            organization_id
            school_id
          }
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

      const profile = data?.profiles?.[0] ?? null;
      const legacyProfile = data?.user_profiles_by_pk ?? null;
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
