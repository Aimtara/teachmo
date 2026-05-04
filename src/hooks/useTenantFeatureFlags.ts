import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@nhost/react';
import { getTenantFeatureFlagsForUser } from '@/domains/tenant/featureFlags';

type FeatureFlags = Record<string, boolean>;

export function useTenantFeatureFlags() {
  const authUser = useUserData();
  const userId = authUser?.id ?? null;

  return useQuery({
    queryKey: ['tenant-feature-flags', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FeatureFlags> => {
      if (!userId) return {};
      return getTenantFeatureFlagsForUser(userId);
    },
  });
}
