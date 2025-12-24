import { useQuery } from '@tanstack/react-query';
import { useUserId } from '@nhost/react';
import { graphql } from '@/lib/graphql';

export type TenantScope = {
  userId: string;
  role?: string | null;
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

      const p = data?.user_profiles_by_pk;
      return {
        userId,
        fullName: p?.full_name ?? null,
        role: p?.role ?? null,
        districtId: p?.district_id ?? null,
        schoolId: p?.school_id ?? null,
      };
    },
  });
}
