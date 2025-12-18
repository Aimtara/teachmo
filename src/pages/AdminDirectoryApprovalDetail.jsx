import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function SamplesList({ title, items, render }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
        {items.slice(0, 10).map((item, idx) => (
          <li key={idx}>{render(item)}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDirectoryApprovalDetail() {
  const { approvalId } = useParams();
  const navigate = useNavigate();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const stats = useMemo(() => approval?.stats ?? {}, [approval]);
  const counts = useMemo(() => approval?.preview?.diff?.counts ?? {}, [approval]);
  const samples = useMemo(() => approval?.preview?.diff?.samples ?? {}, [approval]);
  const pct = stats.pct ?? (stats.activeCount ? (stats.toDeactivateCount ?? 0) / stats.activeCount : null);

  const loadApproval = useCallback(async () => {
    if (!approvalId) return;
    setLoading(true);
    setError('');
    try {
      const data = await DirectoryApprovalsAdminAPI.getApproval(approvalId);
      setApproval(data);
      setMessage('');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load approval');
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  useEffect(() => {
    loadApproval();
  }, [loadApproval]);

  const handleApprove = async () => {
    if (!approvalId) return;
    setActionLoading(true);
    setError('');
    try {
      await DirectoryApprovalsAdminAPI.approve(approvalId, reason || undefined);
      setMessage('Approval marked as approved.');
      await loadApproval();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Approve failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!approvalId || !reason) {
      setError('Rejection reason is required.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await DirectoryApprovalsAdminAPI.reject(approvalId, reason);
      setMessage('Approval rejected.');
      await loadApproval();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Reject failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!approvalId) return;
    setActionLoading(true);
    setError('');
    try {
      await DirectoryApprovalsAdminAPI.apply(approvalId);
      setMessage('Preview apply started.');
      await loadApproval();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Apply failed');
    } finally {
      setActionLoading(false);
    }
  };

  const status = approval?.status ?? 'pending';
  const canApprove = status === 'pending';
  const canReject = status === 'pending';
  const canApply = status === 'approved' && !approval?.applied_at;

  if (loading && !approval) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading approval...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Approval detail</h1>
        <p className="text-gray-600">Review the risky deactivations before applying.</p>
      </header>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-blue-700 hover:underline"
          onClick={() => navigate('/admin/directory-approvals')}
        >
          ← Back to approvals
        </button>
        {approval?.preview_id && (
          <Link className="text-blue-700 hover:underline" to={`/admin/directory-import/preview/${approval.preview_id}`}>
            View preview
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <div className="bg-white rounded shadow p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-800">Status: {status}</p>
            <p className="text-xs text-gray-600">Requested {formatDate(approval?.requested_at)}</p>
            <p className="text-xs text-gray-600">Expires {formatDate(approval?.expires_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!canApprove || actionLoading}
              onClick={handleApprove}
            >
              Approve
            </button>
            <button
              type="button"
              className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!canReject || actionLoading || !reason}
              onClick={handleReject}
            >
              Reject
            </button>
            <button
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!canApply || actionLoading}
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Decision reason (optional for approval, required for rejection)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Add context for this decision"
          />
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="To deactivate" value={stats.toDeactivateCount ?? '—'} />
          <Stat label="Active" value={stats.activeCount ?? '—'} />
          <Stat label="Percent" value={formatPercent(pct)} />
          <Stat label="Requested by" value={approval?.requested_by ?? '—'} />
        </div>
      </div>

      <section className="bg-white rounded shadow p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Diff summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
          <Stat label="To add" value={counts.toAdd ?? '—'} />
          <Stat label="To update" value={counts.toUpdate ?? '—'} />
          <Stat label="To deactivate" value={counts.toDeactivate ?? '—'} />
          <Stat label="Invalid" value={counts.invalid ?? '—'} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SamplesList
            title="Deactivate samples"
            items={samples.toDeactivate}
            render={(item) => item.email || JSON.stringify(item)}
          />
          <SamplesList
            title="Update samples"
            items={samples.toUpdate}
            render={(item) => `${item.email || ''} → ${item.to || ''}`}
          />
          <SamplesList
            title="Add samples"
            items={samples.toAdd}
            render={(item) => item.email || JSON.stringify(item)}
          />
          <SamplesList
            title="Invalid samples"
            items={samples.invalid}
            render={(item) => `${item.email || ''} (${item.reason || 'invalid'})`}
          />
        </div>
      </section>
    </div>
  );
}
