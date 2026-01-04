import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantScope } from '@/hooks/useTenantScope';
import { graphql } from '@/lib/graphql';
import { useStore } from '@/components/hooks/useStore';

const EMPTY_FLAGS = {};

function normalizeFlags(rows = []) {
  const districtFlags = rows.filter((row) => !row.school_id);
  const schoolFlags = rows.filter((row) => row.school_id);
  const merged = {};

  districtFlags.forEach((row) => {
    if (row?.key) merged[row.key] = Boolean(row.enabled);
  });
  schoolFlags.forEach((row) => {
    if (row?.key) merged[row.key] = Boolean(row.enabled);
  });

  return merged;
}

export default function FeatureFlagProvider({ children }) {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const setFeatureFlags = useStore((state) => state.setFeatureFlags);

  const { data } = useQuery({
    queryKey: ['feature-flags', organizationId, schoolId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = `query FeatureFlags($organizationId: uuid!, $schoolId: uuid) {
        feature_flags(
          where: {
            organization_id: { _eq: $organizationId },
            _or: [
              { school_id: { _is_null: true } },
              { school_id: { _eq: $schoolId } }
            ]
          },
          order_by: { school_id: desc_nulls_last }
        ) {
          id
          key
          enabled
          school_id
        }
      }`;

      const res = await graphql(query, { organizationId, schoolId });
      return res?.feature_flags ?? [];
    },
  });

  useEffect(() => {
    if (!organizationId) {
      setFeatureFlags(EMPTY_FLAGS);
      return;
    }
    const normalized = normalizeFlags(data || []);
    setFeatureFlags(normalized);
  }, [data, organizationId, setFeatureFlags]);

  return children;
}
