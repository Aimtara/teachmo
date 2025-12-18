import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@nhost/react';
import { useNavigate } from 'react-router-dom';
import { DirectoryApprovalsAdminAPI } from '@/api/adapters';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatPercent(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const pct = Number(value) * 100;
  return `${pct.toFixed(1)}%`;
}

function formatCounts(stats = {}) {
  const entries = [
    ['Deactivate', stats.toDeactivateCount ?? stats.toDeactivate],
    ['Active', stats.activeCount ?? stats.currentActive],
  ].filter(([, val]) => val !== undefined);

  if (entries.length === 0) return '—';
  return entries.map(([label, val]) => `${label}: ${val}`).join(' • ');
}

export default function AdminDirectoryApprovals() {
  const user = useUserData();
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
  const [status, setStatus] = useState('pending');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await DirectoryApprovalsAdminAPI.listApprovals({
        schoolId: schoolId || undefined,
        districtId: districtId || undefined,
        status: status || undefined,
      });
      setApprovals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [schoolId, districtId, status]);

  useEffect(() => {
    if (!schoolId && defaultSchoolId) setSchoolId(defaultSchoolId);
  }, [defaultSchoolId, schoolId]);

  useEffect(() => {
    if (!districtId && defaultDistrictId) setDistrictId(defaultDistrictId);
  }, [defaultDistrictId, districtId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Directory approvals</h1>
        <p className="text-gray-600">Review risky deactivation requests before applying them.</p>
      </header>

      <div className="bg-white rounded shadow p-4 space-y-4">
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

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="applied">Applied</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={loadApprovals}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <section className="bg-white rounded shadow divide-y">
        <header className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-gray-600">Showing up to 50 approvals</p>
            {status ? <p className="text-xs text-gray-500">Status: {status}</p> : null}
          </div>
          <span className="text-sm text-gray-500">{approvals.length} result(s)</span>
        </header>

        <div className="divide-y">
          {approvals.length === 0 && !loading ? (
            <p className="p-4 text-gray-600">No approvals found.</p>
          ) : null}
          {approvals.map((approval) => {
            const stats = approval.stats || {};
            const pct = stats.pct ?? (stats.activeCount ? (stats.toDeactivateCount ?? 0) / stats.activeCount : null);
            return (
              <button
                key={approval.id}
                type="button"
                onClick={() => navigate(`/admin/directory-approvals/${approval.id}`)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800">{approval.status}</p>
                    <p className="text-xs text-gray-600">Requested {formatDate(approval.requested_at)}</p>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1 text-right">
                    <p>{formatCounts(stats)}</p>
                    <p className="text-xs text-gray-600">{formatPercent(pct)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Preview: {approval.preview_id}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
