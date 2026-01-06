import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantScope } from '@/hooks/useTenantScope';
import { useStore } from '@/components/hooks/useStore';
import { fetchFeatureFlags } from '@/utils/featureFlagClient';

const EMPTY_FLAGS = {};

export default function FeatureFlagProvider({ children }) {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const setFeatureFlags = useStore((state) => state.setFeatureFlags);

  const { data } = useQuery({
    queryKey: ['feature-flags', organizationId, schoolId],
    enabled: Boolean(organizationId),
    queryFn: () => fetchFeatureFlags(),
  });

  useEffect(() => {
    if (!organizationId) {
      setFeatureFlags(EMPTY_FLAGS);
      return;
    }
    const flags = data?.flags ?? EMPTY_FLAGS;
    setFeatureFlags(flags);
  }, [data, organizationId, setFeatureFlags]);

  return children;
}
