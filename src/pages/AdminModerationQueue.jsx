import { useEffect, useState } from 'react';
import { MessagingModerationAPI } from '@/api/adapters';

export default function AdminModerationQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [actionState, setActionState] = useState({});

  const loadReports = async () => {
    setLoading(true);
    try {
      const list = await MessagingModerationAPI.listReports({ status: statusFilter });
      setReports(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const triage = async (reportId, payload) => {
    if (!reportId) return;
    setActionState((prev) => ({ ...prev, [reportId]: true }));
    try {
      await MessagingModerationAPI.triageReport({ reportId, ...payload });
      await loadReports();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Unable to triage report');
    } finally {
      setActionState((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Messaging moderation</p>
          <h1 className="text-3xl font-semibold text-gray-900">Message Reports</h1>
          <p className="text-sm text-gray-600">Review incoming reports and take action.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm"
          >
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <button
            type="button"
            onClick={loadReports}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Loading reports…</p>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900">No reports</p>
          <p className="text-sm text-gray-600">No reports match the selected status.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Reporter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <div className="font-semibold">{report.reason || 'n/a'}</div>
                    <div className="text-xs text-gray-500">{report.detail || 'No details provided'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">{report.reporter_user_id || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{report.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 capitalize">{report.severity}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionState[report.id]}
                        onClick={() => triage(report.id, { status: 'triaged', severity: 'medium', action: 'none' })}
                        className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                      >
                        Triage
                      </button>
                      <button
                        type="button"
                        disabled={actionState[report.id]}
                        onClick={() => triage(report.id, { status: 'resolved', severity: 'low', action: 'close_thread' })}
                        className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Resolve &amp; close
                      </button>
                      <button
                        type="button"
                        disabled={actionState[report.id]}
                        onClick={() => triage(report.id, { status: 'dismissed', severity: 'low', action: 'none' })}
                        className="rounded border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
