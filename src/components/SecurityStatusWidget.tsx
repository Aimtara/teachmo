import React, { useEffect, useMemo, useState } from 'react';
import { computeSecurityStatus, fetchAuditSummary, type SecurityStatus } from '@/domains/securityStatus';

export default function SecurityStatusWidget() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const overallHealth = useMemo(() => {
    if (!status) return 'Unknown';
    if (status.failed > 0) return 'Action required';
    if (status.pending > 0) return 'In review';
    return 'Healthy';
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const summary = await fetchAuditSummary();
      if (!cancelled) {
        setStatus(computeStatus(summary));
        setIsLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Security posture</h3>
          <p className="text-sm text-gray-600">Status based on the latest audit signals.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">{overallHealth}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded bg-green-50 p-3">
          <p className="text-xl font-bold text-green-700">{status?.passed ?? '–'}</p>
          <p className="text-gray-700">Passed</p>
        </div>
        <div className="rounded bg-amber-50 p-3">
          <p className="text-xl font-bold text-amber-700">{status?.pending ?? '–'}</p>
          <p className="text-gray-700">In review</p>
        </div>
        <div className="rounded bg-red-50 p-3">
          <p className="text-xl font-bold text-red-700">{status?.failed ?? '–'}</p>
          <p className="text-gray-700">Action needed</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {isLoading ? 'Refreshing security data…' : `Last checked ${status?.lastChecked ? new Date(status.lastChecked).toLocaleString() : 'recently'}`}
      </p>
    </div>
  );
}

export { SecurityStatusWidget };
