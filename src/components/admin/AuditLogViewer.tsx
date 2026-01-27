import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

type AuditLogEntry = {
  id: string | number;
  user_email?: string;
  adminId?: string;
  action: string;
  entity?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

export const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/audit-logs`)
      .then((res) => res.json())
      .then((data) => setLogs(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-2">Audit Log</h2>
      <div className="overflow-x-auto bg-white border rounded shadow p-4">
        {loading ? (
          <p className="text-sm text-gray-600">Loading audit log…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="py-2 pr-4">{log.user_email || log.adminId || 'System'}</td>
                  <td className="py-2 pr-4">{log.entity ? `${log.entity} ${log.action}` : log.action}</td>
                  <td className="py-2 pr-4">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{JSON.stringify(log.meta || {})}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No audit history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
