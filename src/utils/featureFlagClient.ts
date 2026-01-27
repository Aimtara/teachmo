export type FeatureFlagRecord = {
  key: string;
  description?: string | null;
  defaultEnabled?: boolean;
  enabled?: boolean;
  rolloutPercentage?: number | null;
  canaryPercentage?: number | null;
  allowlist?: string[];
  denylist?: string[];
  scope?: 'organization' | 'school';
  source?: 'registry' | 'override';
};

export type FeatureFlagResponse = {
  flags: Record<string, boolean>;
};

export type FeatureFlagAdminResponse = {
  flags: FeatureFlagRecord[];
};

export async function fetchFeatureFlags(): Promise<FeatureFlagResponse> {
  const res = await fetch('/api/feature-flags');
  if (!res.ok) throw new Error('Failed to load feature flags');
  return res.json();
}

export async function fetchAdminFeatureFlags(params: {
  organizationId?: string | null;
  schoolId?: string | null;
}): Promise<FeatureFlagAdminResponse> {
  const query = new URLSearchParams();
  if (params.organizationId) query.set('organizationId', params.organizationId);
  if (params.schoolId) query.set('schoolId', params.schoolId);

  const res = await fetch(`/api/admin/feature-flags?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load admin feature flags');
  return res.json();
}

export async function updateAdminFeatureFlag(payload: {
  key: string;
  organizationId?: string | null;
  schoolId?: string | null;
  enabled?: boolean;
  description?: string | null;
  rolloutPercentage?: number | null;
  canaryPercentage?: number | null;
  allowlist?: string[];
  denylist?: string[];
}): Promise<FeatureFlagRecord> {
  const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(payload.key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to update feature flag');
  return res.json();
}

export function joinList(values: string[] | undefined): string {
  return (values ?? []).join(', ');
}

export function splitList(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
