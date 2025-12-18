import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DirectoryAdminAPI } from '@/api/adapters';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return value;
  }
}

export default function AdminDirectoryJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await DirectoryAdminAPI.getDirectoryImportJob(jobId);
        setJob(data);
      } catch (err) {
        console.error(err);
        setError(err?.message ?? 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [jobId]);

  const stats = job?.stats || {};
  const errors = Array.isArray(job?.errors) ? job.errors : [];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Directory job detail</h1>
          <p className="text-gray-600">Job ID: {jobId}</p>
          {job ? <p className="text-sm text-gray-500">Status: {job.status}</p> : null}
        </div>
        <button type="button" className="border px-3 py-1 rounded" onClick={() => navigate(-1)}>
          Back
        </button>
      </header>

      {loading ? <p className="text-gray-600">Loading…</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      {job ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded shadow p-4 space-y-2">
            <h2 className="text-lg font-semibold">Metadata</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p>School: {job.school_id}</p>
              <p>District: {job.district_id || '—'}</p>
              <p>Source: {job.source_type} {job.source_ref ? `(${job.source_ref})` : ''}</p>
              <p>Started: {formatDate(job.started_at)}</p>
              <p>Finished: {formatDate(job.finished_at)}</p>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4 space-y-2">
            <h2 className="text-lg font-semibold">Stats</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Total rows: {stats.totalRows ?? '—'}</p>
              <p>Valid: {stats.totalValid ?? '—'}</p>
              <p>Invalid: {stats.invalid ?? '—'}</p>
              <p>Upserted: {stats.upserted ?? '—'}</p>
              <p>Deactivated: {stats.deactivated ?? '—'}</p>
              <p>Deactivate missing: {stats.deactivateMissing ? 'Yes' : 'No'}</p>
              <p>Dry run: {stats.dryRun ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4 space-y-2 md:col-span-2">
            <h2 className="text-lg font-semibold">Errors</h2>
            {errors.length === 0 ? <p className="text-gray-600">No errors recorded.</p> : null}
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {errors.map((errItem, idx) => (
                <li key={`${errItem?.reason ?? 'err'}-${idx}`}>
                  <span className="font-semibold">{errItem?.reason || 'error'}:</span> {errItem?.message || ''}
                  {errItem?.row ? <span className="text-gray-500"> (row {errItem.row})</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
