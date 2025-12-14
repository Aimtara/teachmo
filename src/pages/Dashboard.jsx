import { useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';
import { useUserRole } from '@/hooks/useUserRole';

export default function Dashboard() {
  const { isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();
  const role = useUserRole();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ submissions: [], incentives: [], assignments: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      setLoading(true);
      try {
        const [submissions, incentives, assignments] = await Promise.all([
          fetch(`${API_BASE_URL}/submissions`).then((res) => res.json()),
          fetch(`${API_BASE_URL}/incentives`).then((res) => res.json()),
          fetch(`${API_BASE_URL}/assignments`).then((res) => res.json())
        ]);
        setData({ submissions, incentives, assignments });
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const pendingSubmissions = useMemo(
    () => data.submissions.filter((item) => item.status === 'pending'),
    [data.submissions]
  );

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Logged in as {user?.email}</p>
          <h1 className="text-3xl font-semibold text-gray-900">Family dashboard</h1>
          <p className="text-gray-600">Role detected: {role}</p>
        </div>
      </header>

      {loading && <p className="text-gray-600">Loading your latest updates…</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Unable to load updates. {error.message}
        </p>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">New assignments</h2>
            <p className="text-sm text-gray-500 mb-3">Pulled from the Teachmo backend API.</p>
            <ul className="space-y-2">
              {data.assignments.map((assignment) => (
                <li key={assignment.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-gray-900">{assignment.title}</p>
                  <p className="text-sm text-gray-600">{assignment.description}</p>
                </li>
              ))}
              {data.assignments.length === 0 && (
                <li className="text-sm text-gray-500">No assignments yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Partner submissions</h2>
            <p className="text-sm text-gray-500 mb-3">Monitor ideas waiting for review.</p>
            <ul className="space-y-2">
              {pendingSubmissions.map((item) => (
                <li key={item.id} className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                  <p className="font-medium text-amber-900">{item.title}</p>
                  <p className="text-sm text-amber-800">{item.description}</p>
                </li>
              ))}
              {pendingSubmissions.length === 0 && (
                <li className="text-sm text-gray-500">You have no pending submissions.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Open incentives</h2>
            <p className="text-sm text-gray-500 mb-3">Claim rewards for your organization.</p>
            <ul className="space-y-2">
              {data.incentives.map((incentive) => (
                <li key={incentive.id} className="rounded-lg bg-green-50 p-3 border border-green-100">
                  <p className="font-medium text-green-900">{incentive.title}</p>
                  <p className="text-sm text-green-800">Value: ${incentive.value}</p>
                </li>
              ))}
              {data.incentives.length === 0 && (
                <li className="text-sm text-gray-500">No incentive programs are active.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
