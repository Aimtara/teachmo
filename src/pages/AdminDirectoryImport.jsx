import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserData } from '@nhost/react';
import { useNavigate } from 'react-router-dom';
import { DirectoryAdminAPI, DirectoryPreviewAdminAPI } from '@/api/adapters';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatStats(stats = {}) {
  const entries = [
    ['Rows', stats.totalRows],
    ['Valid', stats.totalValid],
    ['Invalid', stats.invalid],
    ['Upserted', stats.upserted],
    ['Deactivated', stats.deactivated],
  ].filter(([, val]) => val !== undefined);

  if (entries.length === 0) return '—';

  return entries.map(([label, val]) => `${label}: ${val}`).join(' • ');
}

export default function AdminDirectoryImport() {
  const user = useUserData();
  const defaultSchoolId = useMemo(
    () => String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim(),
    [user]
  );

  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [csvText, setCsvText] = useState('email,contact_type\n');
  const [sourceRef, setSourceRef] = useState('');
  const [deactivateMissing, setDeactivateMissing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadJobs = useCallback(async (id = schoolId) => {
    if (!id) return;
    setJobsLoading(true);
    try {
      const resp = await DirectoryAdminAPI.getDirectoryImportJobs({ schoolId: id });
      const payload = resp?.jobs ?? resp ?? [];
      setJobs(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId && defaultSchoolId) setSchoolId(defaultSchoolId);
  }, [defaultSchoolId, schoolId]);

  useEffect(() => {
    if (schoolId) {
      loadJobs(schoolId);
    }
  }, [loadJobs, schoolId]);

  const handleFile = (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    setSourceRef(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText(String(e.target?.result ?? ''));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError('');
    setResult(null);

    if (!schoolId) {
      setError('School ID is required.');
      return;
    }

    try {
      setSubmitting(true);
      const resp = await DirectoryPreviewAdminAPI.previewImport({
        csvText,
        schoolId,
        deactivateMissing,
        sourceRef: sourceRef || undefined,
      });
      setResult(resp);
      if (resp?.previewId) {
        navigate(`/admin/directory-import/preview/${resp.previewId}`);
      }
      await loadJobs(schoolId);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Directory import (CSV)</h1>
        <p className="text-gray-600">Securely sync parent/guardian contacts into the school directory.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">School ID</span>
            <input
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="uuid-for-school"
              className="w-full border rounded px-3 py-2"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Source reference (filename)</span>
            <input
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="hcps_roster_2025-12-17.csv"
              className="w-full border rounded px-3 py-2"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={deactivateMissing}
              onChange={(e) => setDeactivateMissing(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">Deactivate missing</span>
          </label>
          <p className="text-xs text-gray-500">
            Preview the import to see adds/updates/deactivations before applying. Deactivate missing will set contacts not present in the CSV to inactive when applied.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">CSV contents</label>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm text-gray-600" />
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            placeholder="email,contact_type&#10;parent1@example.com,parent_guardian"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Creating preview…' : 'Preview import'}
          </button>
          {result?.previewId && (
            <button
              type="button"
              onClick={() => navigate(`/admin/directory-import/preview/${result.previewId}`)}
              className="text-sm text-blue-700 hover:underline"
            >
              View preview
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Recent imports</h2>
            <p className="text-sm text-gray-600">Last 20 jobs for this school.</p>
          </div>
          <button
            type="button"
            onClick={() => loadJobs()}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            disabled={jobsLoading}
          >
            {jobsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="p-2">Started</th>
                <th className="p-2">Status</th>
                <th className="p-2">Source</th>
                <th className="p-2">Stats</th>
                <th className="p-2">Finished</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-gray-500">
                    No import jobs yet.
                  </td>
                </tr>
              )}
              {jobs.map((job) => (
                <tr key={job.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{formatDate(job.started_at)}</td>
                  <td className="p-2 font-medium">{job.status}</td>
                  <td className="p-2">{job.source_ref || job.source_type}</td>
                  <td className="p-2">{formatStats(job.stats)}</td>
                  <td className="p-2 whitespace-nowrap">{formatDate(job.finished_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
