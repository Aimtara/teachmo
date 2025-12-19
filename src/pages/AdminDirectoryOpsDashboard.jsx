import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@nhost/react';
import { DirectoryInvitesAPI, DirectoryOpsAdminAPI } from '@/api/adapters';

const EMPTY_SUMMARY = {
  sources: [],
  pendingApprovals: [],
  recentJobs: [],
  directoryMetrics: { active: 0, inactive: 0, lastChangeCounts: { added: 0, updated: 0, deactivated: 0, invalid: 0 } },
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return value;
  }
}

function statusClass(status) {
  if (!status) return 'bg-gray-100 text-gray-700';
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'needs_approval':
      return 'bg-yellow-100 text-yellow-800';
    case 'skipped':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

function formatSourceType(value) {
  if (value === 'https_url') return 'HTTPS URL';
  if (value === 'sftp') return 'SFTP';
  return value || '—';
}

function formatPct(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export default function AdminDirectoryOpsDashboard() {
  const user = useUserData();
  const navigate = useNavigate();

  const defaultSchoolId = useMemo(
    () => String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim(),
    [user]
  );
  const defaultDistrictId = useMemo(
    () => String(user?.metadata?.district_id ?? user?.metadata?.districtId ?? '').trim(),
    [user]
  );

  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [districtId, setDistrictId] = useState(defaultDistrictId);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [runningSourceId, setRunningSourceId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('parent');
  const [inviteStatus, setInviteStatus] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!schoolId && defaultSchoolId) setSchoolId(defaultSchoolId);
  }, [defaultSchoolId, schoolId]);

  useEffect(() => {
    if (!districtId && defaultDistrictId) setDistrictId(defaultDistrictId);
  }, [defaultDistrictId, districtId]);

  const failingSources = useMemo(
    () => summary.sources.filter((src) => src.lastRunStatus && src.lastRunStatus !== 'completed' && src.lastRunStatus !== 'skipped'),
    [summary.sources]
  );

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await DirectoryOpsAdminAPI.getOpsSummary({
        schoolId: schoolId || undefined,
        districtId: districtId || undefined,
      });
      const payload = data || {};
      setSummary({
        ...EMPTY_SUMMARY,
        ...payload,
        directoryMetrics: { ...EMPTY_SUMMARY.directoryMetrics, ...(payload?.directoryMetrics || {}) },
      });
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [schoolId, districtId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleSyncSource = useCallback(async (sourceId) => {
    if (!sourceId) return;
    setRunningSourceId(sourceId);
    setError('');
    setSuccess('');
    try {
      await DirectoryOpsAdminAPI.syncSource(sourceId);
      setSuccess('Sync started');
      await loadSummary();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to sync source');
    } finally {
      setRunningSourceId('');
    }
  }, [loadSummary]);

  const handleViewJob = useCallback((jobId) => {
    if (jobId) navigate(`/admin/directory-jobs/${jobId}`);
  }, [navigate]);

  const handleViewPreview = useCallback((previewId) => {
    if (previewId) navigate(`/admin/directory-import/preview/${previewId}`);
  }, [navigate]);

  const handleOpenApproval = useCallback((approvalId) => {
    if (approvalId) navigate(DirectoryOpsAdminAPI.openApproval(approvalId));
  }, [navigate]);

  const handleSendInvite = useCallback(async () => {
    if (!schoolId || !inviteEmail) {
      setInviteError('School ID and email are required');
      return;
    }
    setInviteLoading(true);
    setInviteError('');
    setInviteStatus('');
    try {
      const resp = await DirectoryInvitesAPI.createDirectoryInvite({
        schoolId,
        districtId: districtId || undefined,
        email: inviteEmail,
        role: inviteRole
      });
      if (resp?.ok) {
        setInviteStatus(resp.status || 'sent');
      } else {
        setInviteError(resp?.reason || 'Unable to send invite');
      }
    } catch (err) {
      console.error(err);
      setInviteError(err?.message ?? 'Unable to send invite');
    } finally {
      setInviteLoading(false);
    }
  }, [schoolId, districtId, inviteEmail, inviteRole]);

  const changeCounts = summary.directoryMetrics?.lastChangeCounts || { added: 0, updated: 0, deactivated: 0, invalid: 0 };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Directory Ops dashboard</h1>
        <p className="text-gray-600">Monitor sync health, approvals, and coverage at a glance.</p>
      </header>

      <section className="bg-white rounded shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">School ID</span>
            <input
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="uuid-for-school"
              className="w-full border rounded px-3 py-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">District ID</span>
            <input
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              placeholder="uuid-for-district"
              className="w-full border rounded px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={loadSummary}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {error ? <span className="text-sm text-red-600">{error}</span> : null}
            {success ? <span className="text-sm text-green-600">{success}</span> : null}
          </div>
        </div>
      </section>

      <section className="bg-white rounded shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invite directory contact</h2>
            <p className="text-sm text-gray-600">Send a claim invite to a directory email.</p>
          </div>
          {inviteStatus ? <span className="text-sm text-green-600">Status: {inviteStatus}</span> : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full border rounded px-3 py-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={handleSendInvite}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={inviteLoading}
            >
              {inviteLoading ? 'Sending…' : 'Send invite'}
            </button>
            {inviteError ? <span className="text-sm text-red-600">{inviteError}</span> : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded shadow p-4 space-y-2">
          <p className="text-sm text-gray-600">Active contacts</p>
          <p className="text-2xl font-semibold">{summary.directoryMetrics?.active ?? 0}</p>
          <p className="text-xs text-gray-500">Inactive: {summary.directoryMetrics?.inactive ?? 0}</p>
        </div>
        <div className="bg-white rounded shadow p-4 space-y-2">
          <p className="text-sm text-gray-600">Pending approvals</p>
          <p className="text-2xl font-semibold">{summary.pendingApprovals?.length ?? 0}</p>
          <p className="text-xs text-gray-500">Requires review</p>
        </div>
        <div className="bg-white rounded shadow p-4 space-y-2">
          <p className="text-sm text-gray-600">Sources needing attention</p>
          <p className="text-2xl font-semibold">{failingSources.length}</p>
          <p className="text-xs text-gray-500">Failed or needs approval</p>
        </div>
        <div className="bg-white rounded shadow p-4 space-y-2">
          <p className="text-sm text-gray-600">Last changes</p>
          <div className="text-xs text-gray-700 space-y-1">
            <p>Added: {changeCounts.added ?? 0}</p>
            <p>Updated: {changeCounts.updated ?? 0}</p>
            <p>Deactivated: {changeCounts.deactivated ?? 0}</p>
            <p>Invalid: {changeCounts.invalid ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded shadow">
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Sources</h2>
            <p className="text-sm text-gray-600">Last run status, quick actions, and shortcuts.</p>
          </div>
          <span className="text-sm text-gray-500">{summary.sources?.length ?? 0} source(s)</span>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last run</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.sources?.length ? null : (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm text-gray-600">No sources configured.</td>
                </tr>
              )}
              {summary.sources?.map((source) => (
                <tr key={source.sourceId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 space-y-1">
                    <p className="text-sm font-semibold text-gray-800">{source.name}</p>
                    <p className="text-xs text-gray-500">{source.enabled ? 'Enabled' : 'Disabled'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatSourceType(source.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(source.lastRunAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass(source.lastRunStatus)}`}>
                      {source.lastRunStatus || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="space-y-0.5">
                      <p>Valid: {source.stats?.totalValid ?? 0}</p>
                      <p>Deactivate: {source.stats?.toDeactivateCount ?? 0}</p>
                      <p>Risk: {formatPct(source.stats?.pct)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        onClick={() => handleSyncSource(source.sourceId)}
                        disabled={runningSourceId === source.sourceId}
                      >
                        {runningSourceId === source.sourceId ? 'Running…' : 'Run now'}
                      </button>
                      <button
                        type="button"
                        className="border px-3 py-1 rounded text-sm disabled:opacity-50"
                        disabled={!source.lastJobId}
                        onClick={() => handleViewJob(source.lastJobId)}
                      >
                        View run
                      </button>
                      <button
                        type="button"
                        className="border px-3 py-1 rounded text-sm disabled:opacity-50"
                        disabled={!source.lastPreviewId}
                        onClick={() => handleViewPreview(source.lastPreviewId)}
                      >
                        View preview
                      </button>
                      <button
                        type="button"
                        className="border px-3 py-1 rounded text-sm disabled:opacity-50"
                        disabled={!source.lastApprovalId}
                        onClick={() => handleOpenApproval(source.lastApprovalId)}
                      >
                        Open approval
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow divide-y">
          <header className="px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pending approvals</h3>
              <p className="text-sm text-gray-600">Requires admin review</p>
            </div>
            <span className="text-sm text-gray-500">{summary.pendingApprovals?.length ?? 0}</span>
          </header>
          <div className="divide-y">
            {summary.pendingApprovals?.length ? null : <p className="p-4 text-gray-600">No pending approvals.</p>}
            {summary.pendingApprovals?.map((approval) => (
              <div key={approval.approvalId} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{approval.approvalId}</p>
                    <p className="text-xs text-gray-500">Requested {formatDate(approval.requestedAt)}</p>
                  </div>
                  <div className="text-right text-sm text-gray-700">
                    <p>Deactivate: {approval.toDeactivateCount ?? 0}</p>
                    <p className="text-xs text-gray-500">Risk: {formatPct(approval.pct)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="border px-3 py-1 rounded text-sm"
                    onClick={() => handleOpenApproval(approval.approvalId)}
                  >
                    Open approval
                  </button>
                  {approval.previewId ? (
                    <button
                      type="button"
                      className="border px-3 py-1 rounded text-sm"
                      onClick={() => handleViewPreview(approval.previewId)}
                    >
                      View preview
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded shadow divide-y">
          <header className="px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent import jobs</h3>
              <p className="text-sm text-gray-600">Latest sync/apply activity</p>
            </div>
            <span className="text-sm text-gray-500">{summary.recentJobs?.length ?? 0}</span>
          </header>
          <div className="divide-y">
            {summary.recentJobs?.length ? null : <p className="p-4 text-gray-600">No jobs yet.</p>}
            {summary.recentJobs?.map((job) => (
              <div key={job.jobId} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{job.status}</p>
                    <p className="text-xs text-gray-500">Started {formatDate(job.startedAt)}</p>
                  </div>
                  <button
                    type="button"
                    className="border px-3 py-1 rounded text-sm"
                    onClick={() => handleViewJob(job.jobId)}
                  >
                    View details
                  </button>
                </div>
                <div className="text-xs text-gray-700 space-y-0.5">
                  <p>Valid: {job.stats?.totalValid ?? 0}</p>
                  <p>Invalid: {job.stats?.invalid ?? 0}</p>
                  <p>Deactivated: {job.stats?.deactivated ?? 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
