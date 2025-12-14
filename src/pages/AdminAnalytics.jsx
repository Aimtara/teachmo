import { useEffect, useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';

export default function AdminAnalytics() {
  const { isAuthenticated } = useAuthenticationStatus();
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      setLoading(true);
      try {
        const [auditLog, pendingApplications] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/audits`).then((res) => res.json()),
          fetch(`${API_BASE_URL}/incentives/applications/demo`).then((res) => res.json())
        ]);
        setAudits(auditLog.slice(-10).reverse());
        setApplications(pendingApplications);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Admin analytics</h1>
        <p className="text-gray-600">Review recent approvals and incentives without leaving the dashboard.</p>
      </header>

      {loading && <p className="text-gray-600">Loading admin events…</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Unable to load admin activity. {error.message}
        </p>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent audit log</h2>
            <ul className="space-y-2">
              {audits.map((item) => (
                <li key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">{item.entity} {item.action}</p>
                  <p className="text-xs text-gray-600">{new Date(item.timestamp).toLocaleString()}</p>
                </li>
              ))}
              {audits.length === 0 && <li className="text-sm text-gray-500">No audit history yet.</li>}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Incentive applications</h2>
            <ul className="space-y-2">
              {applications.map((application) => (
                <li key={application.id} className="rounded-lg bg-emerald-50 p-3">
                  <p className="font-medium text-emerald-900">Partner {application.partnerId}</p>
                  <p className="text-sm text-emerald-800">Status: {application.status}</p>
                  {application.payout && (
                    <p className="text-xs text-emerald-700">Payout: {application.payout}</p>
                  )}
                </li>
              ))}
              {applications.length === 0 && <li className="text-sm text-gray-500">No applications to review.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
