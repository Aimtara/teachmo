import { fetchDirectoryCounts, deriveChangeCounts } from '../_shared/directoryMetrics';
import { getActorScope } from '../_shared/tenantScope';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

function buildWhere(filters: Array<Record<string, any>>) {
  if (filters.length === 0) return {};
  return { _and: filters };
}

function normalizeChangeCounts(input: any): { added: number; updated: number; deactivated: number; invalid: number } {
  const base = { added: 0, updated: 0, deactivated: 0, invalid: 0 };
  if (!input || typeof input !== 'object') return base;
  return {
    added: Number.isFinite(Number(input.added)) ? Number(input.added) : base.added,
    updated: Number.isFinite(Number(input.updated)) ? Number(input.updated) : base.updated,
    deactivated: Number.isFinite(Number(input.deactivated)) ? Number(input.deactivated) : base.deactivated,
    invalid: Number.isFinite(Number(input.invalid)) ? Number(input.invalid) : base.invalid,
  };
}

function summarizeSourceStats(runStats: any) {
  if (!runStats || typeof runStats !== 'object') return { totalValid: 0, toDeactivateCount: 0, pct: 0 };

  const diffCounts = runStats.diffCounts || {};
  const totalValid = Number(runStats?.apply?.totalValid ?? runStats?.stats?.totalValid ?? 0);
  const toDeactivateCount = Number(
    diffCounts.toDeactivate ?? runStats?.apply?.deactivated ?? runStats?.stats?.toDeactivate ?? 0
  );
  const activeCount = Number(diffCounts.currentActive ?? runStats?.stats?.currentActive ?? 0);
  const pct = activeCount > 0 ? toDeactivateCount / activeCount : 0;

  return { totalValid, toDeactivateCount, pct };
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { schoolId: inputSchoolId, districtId: inputDistrictId } = req.body ?? {};
  const schoolIdRaw = String(inputSchoolId ?? '').trim();
  const districtIdRaw = String(inputDistrictId ?? '').trim();

  async function hasura(query: string, variables?: Record<string, any>) {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  }

  const scope = await getActorScope(hasura, actorId);

  let schoolId = schoolIdRaw;
  let districtId = districtIdRaw;

  if (role === 'school_admin') {
    const scopedSchool = scope.schoolId ?? '';
    if (!scopedSchool) return res.status(403).json({ ok: false });
    if (schoolId && schoolId !== scopedSchool) return res.status(403).json({ ok: false });
    schoolId = scopedSchool;
    districtId = scope.districtId ?? districtId;
  }

  if (role === 'district_admin') {
    const scopedDistrict = scope.districtId ?? '';
    if (!scopedDistrict) return res.status(403).json({ ok: false });
    if (districtId && districtId !== scopedDistrict) return res.status(403).json({ ok: false });
    districtId = scopedDistrict;
  }

  if (!schoolId && !districtId) {
    if (scope.schoolId) schoolId = scope.schoolId;
    else if (scope.districtId) districtId = scope.districtId;
  }

  if (!schoolId && !districtId) return res.status(400).json({ ok: false, reason: 'scope_required' });

  const filters: Array<Record<string, any>> = [];
  if (schoolId) filters.push({ school_id: { _eq: schoolId } });
  if (districtId) filters.push({ district_id: { _eq: districtId } });

  const sourceWhere = buildWhere(filters);
  const runWhere = filters.length ? { source: sourceWhere } : {};
  const approvalWhere = { _and: [...filters, { status: { _eq: 'pending' } }] };
  const jobWhere = buildWhere(filters);
  const snapshotWhere = buildWhere(filters);

  try {
    const resp = await hasura(
      `query OpsSummary($sourceWhere: directory_sources_bool_exp!, $runWhere: directory_source_runs_bool_exp!, $approvalWhere: directory_deactivation_approvals_bool_exp!, $jobWhere: directory_import_jobs_bool_exp!, $snapshotWhere: directory_metrics_snapshots_bool_exp!) {
        sources: directory_sources(where: $sourceWhere, order_by: { name: asc }) {
          id
          name
          source_type
          is_enabled
          last_run_at
          config
        }
        runs: directory_source_runs(
          where: $runWhere,
          distinct_on: source_id,
          order_by: [{ source_id: asc }, { finished_at: desc }, { started_at: desc }]
        ) {
          id
          source_id
          status
          started_at
          finished_at
          job_id
          stats
        }
        approvals: directory_deactivation_approvals(where: $approvalWhere, order_by: { requested_at: desc }, limit: 25) {
          id
          school_id
          district_id
          preview_id
          requested_at
          status
          stats
        }
        jobs: directory_import_jobs(where: $jobWhere, order_by: { started_at: desc }, limit: 10) {
          id
          school_id
          district_id
          status
          started_at
          finished_at
          stats
          source_type
          source_ref
        }
        metrics: directory_metrics_snapshots(where: $snapshotWhere, order_by: { captured_at: desc }, limit: 1) {
          id
          captured_at
          active_contacts
          inactive_contacts
          last_change_counts
          last_import_job_id
          last_preview_id
          last_approval_id
        }
      }`,
      { sourceWhere, runWhere, approvalWhere, jobWhere, snapshotWhere }
    );

    const data = resp?.data ?? {};
    const runsBySource = new Map<string, any>();
    (data.runs || []).forEach((run: any) => {
      if (run?.source_id) runsBySource.set(run.source_id, run);
    });

    const sources = (data.sources || []).map((source: any) => {
      const run = runsBySource.get(source.id) || null;
      const runStats = run?.stats || {};
      const summaryStats = summarizeSourceStats(runStats);

      return {
        sourceId: source.id,
        name: source.name,
        type: source.source_type,
        enabled: Boolean(source.is_enabled),
        lastRunAt: run?.finished_at || run?.started_at || source.last_run_at || null,
        lastRunStatus: run?.status ?? null,
        lastPreviewId: runStats?.previewId ?? null,
        lastApprovalId: runStats?.approvalId ?? null,
        lastJobId: run?.job_id ?? null,
        stats: summaryStats,
      };
    });

    const pendingApprovals = (data.approvals || []).map((approval: any) => {
      const stats = approval?.stats || {};
      const pct = Number(stats.pct ?? (stats.activeCount ? (stats.toDeactivateCount ?? 0) / stats.activeCount : 0));
      return {
        approvalId: approval.id,
        schoolId: approval.school_id,
        districtId: approval.district_id ?? null,
        requestedAt: approval.requested_at,
        previewId: approval.preview_id,
        toDeactivateCount: Number(stats.toDeactivateCount ?? stats.toDeactivate ?? 0),
        pct,
      };
    });

    const recentJobs = (data.jobs || []).map((job: any) => ({
      jobId: job.id,
      schoolId: job.school_id,
      districtId: job.district_id ?? null,
      status: job.status,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      stats: job.stats || {},
      sourceType: job.source_type,
      sourceRef: job.source_ref,
    }));

    const latestSnapshot = Array.isArray(data.metrics) && data.metrics.length > 0 ? data.metrics[0] : null;
    const counts = await fetchDirectoryCounts(hasura, { schoolId, districtId });
    const derivedFallback = deriveChangeCounts(recentJobs?.[0]?.stats || {});
    const changeCounts = normalizeChangeCounts(latestSnapshot?.last_change_counts || derivedFallback);

    const summary = {
      sources,
      pendingApprovals,
      recentJobs,
      directoryMetrics: {
        active: latestSnapshot?.active_contacts ?? counts.active,
        inactive: latestSnapshot?.inactive_contacts ?? counts.inactive,
        lastChangeCounts: changeCounts,
      },
    };

    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    console.error('get-directory-ops-summary failed', error);
    return res.status(500).json({ ok: false });
  }
};
