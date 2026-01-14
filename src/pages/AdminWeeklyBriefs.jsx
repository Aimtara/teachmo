import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { nhost } from '@/lib/nhostClient';

function isoWeekStart(date = new Date()) {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = base.getUTCDay() || 7;
  if (day !== 1) base.setUTCDate(base.getUTCDate() - (day - 1));
  return base.toISOString().slice(0, 10);
}

export default function AdminWeeklyBriefs() {
  const defaultWeekStart = useMemo(() => isoWeekStart(new Date()), []);
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runGenerator = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await nhost.functions.call('generate-weekly-briefs', {
        weekStart,
        dryRun
      });
      if (res.error) throw res.error;
      setResult(res.data);
    } catch (e) {
      setError(e?.message || 'Failed to run generator');
    } finally {
      setLoading(false);
    }
  };

  const runInsights = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await nhost.functions.call('insights-weekly', {
        weekStart
      });
      if (res.error) throw res.error;
      setResult(res.data);
    } catch (e) {
      setError(e?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Weekly Briefs</h1>
          <Link to="/admin" className="text-sm text-blue-700 hover:underline">
            Back to admin
          </Link>
        </div>
        <p className="text-gray-600">
          Pilot tool: generate weekly briefs on demand (dry-run first), then publish.
        </p>
      </header>

      <section className="bg-white rounded shadow p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm text-gray-700">Week start (Mon)</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Dry run (do not write to DB)</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={runGenerator}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {loading ? 'Running…' : dryRun ? 'Run dry run' : 'Generate & publish'}
          </button>

          <button
            onClick={runInsights}
            disabled={loading}
            className="bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load weekly insights'}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Tip: Start with dry run to verify output, then uncheck dry run to publish. In production, schedule
          <code className="px-1">generate-weekly-briefs</code> via a cron.
        </p>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <section className="bg-white rounded shadow p-4">
          <h2 className="font-medium mb-3">Result</h2>
          <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
