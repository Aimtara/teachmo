export type HasuraClient = (query: string, variables?: Record<string, any>) => Promise<any>;

export type DirectoryChangeCounts = {
  added: number;
  updated: number;
  deactivated: number;
  invalid: number;
};

function coerceNumber(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function buildDirectoryWhere(
  params: { schoolId?: string | null; districtId?: string | null },
  extra?: Record<string, any>
) {
  const clauses: any[] = [];
  if (params.schoolId) clauses.push({ school_id: { _eq: params.schoolId } });
  if (params.districtId) clauses.push({ district_id: { _eq: params.districtId } });
  if (extra && Object.keys(extra).length > 0) clauses.push(extra);

  if (clauses.length === 0) return {};
  return { _and: clauses };
}

export function deriveChangeCounts(stats?: any, diffCounts?: any): DirectoryChangeCounts {
  const sources = [diffCounts || {}, stats || {}];

  const pickFrom = (keys: string[], fallback?: number) => {
    for (const src of sources) {
      for (const key of keys) {
        if (src && Object.prototype.hasOwnProperty.call(src, key)) {
          const num = coerceNumber(src[key]);
          if (num) return num;
        }
      }
    }
    return fallback ?? 0;
  };

  const added = pickFrom(['toAdd', 'added', 'inserted', 'created', 'upserted', 'newCount']);
  const updated = pickFrom(['toUpdate', 'updated', 'changed', 'modified', 'upsertedUpdates']);
  const deactivated = pickFrom(['toDeactivate', 'deactivated', 'deactivateCount', 'removed']);
  const invalid = pickFrom(['invalid', 'invalidRows', 'invalidCount']);

  const fallbackAdded = added || (stats?.upserted ? coerceNumber(stats.upserted) : 0);
  return {
    added: fallbackAdded,
    updated,
    deactivated,
    invalid,
  };
}

export async function fetchDirectoryCounts(
  hasura: HasuraClient,
  params: { schoolId?: string | null; districtId?: string | null }
) {
  const activeWhere = buildDirectoryWhere(params, { is_active: { _eq: true } });
  const inactiveWhere = buildDirectoryWhere(params, { is_active: { _eq: false } });

  const resp = await hasura(
    `query DirectoryCounts($activeWhere: school_contact_directory_bool_exp!, $inactiveWhere: school_contact_directory_bool_exp!) {
      active: school_contact_directory_aggregate(where: $activeWhere) { aggregate { count } }
      inactive: school_contact_directory_aggregate(where: $inactiveWhere) { aggregate { count } }
    }`,
    { activeWhere, inactiveWhere }
  );

  const active = resp?.data?.active?.aggregate?.count ?? 0;
  const inactive = resp?.data?.inactive?.aggregate?.count ?? 0;
  return { active: coerceNumber(active), inactive: coerceNumber(inactive) };
}

export async function recordDirectoryMetricsSnapshot(params: {
  hasura: HasuraClient;
  schoolId: string;
  districtId?: string | null;
  stats?: any;
  diffCounts?: any;
  lastImportJobId?: string | null;
  lastPreviewId?: string | null;
  lastApprovalId?: string | null;
  metadata?: Record<string, any>;
}) {
  const { hasura, schoolId, districtId = null, stats, diffCounts, lastImportJobId, lastPreviewId, lastApprovalId, metadata } = params;

  const counts = await fetchDirectoryCounts(hasura, { schoolId, districtId });
  const lastChangeCounts = deriveChangeCounts(stats, diffCounts);

  return hasura(
    `mutation InsertSnapshot($object: directory_metrics_snapshots_insert_input!) {
      insert_directory_metrics_snapshots_one(object: $object) { id }
    }`,
    {
      object: {
        school_id: schoolId,
        district_id: districtId,
        active_contacts: counts.active,
        inactive_contacts: counts.inactive,
        last_import_job_id: lastImportJobId ?? null,
        last_preview_id: lastPreviewId ?? null,
        last_approval_id: lastApprovalId ?? null,
        last_change_counts: lastChangeCounts,
        metadata: metadata ?? {},
      },
    }
  );
}
