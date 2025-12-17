import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DirectoryPreviewAdminAPI } from '@/api/adapters';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatBadge({ label, value, tone = 'gray' }) {
  const toneMap = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
  };
  const color = toneMap[tone] || toneMap.gray;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${color}`}>
      <span className="uppercase tracking-wide">{label}</span>
      <span className="font-semibold">{value ?? 0}</span>
    </span>
  );
}

function SampleList({ title, items = [], renderItem }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      <ul className="divide-y rounded border border-gray-200 bg-white">
        {items.map((item, idx) => (
          <li key={idx} className="p-2 text-sm text-gray-800">
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDirectoryImportPreview() {
  const { previewId } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const diffCounts = preview?.diff?.counts ?? {};
  const diffSamples = preview?.diff?.samples ?? {};
  const stats = preview?.stats ?? {};

  const loadPreview = async () => {
    if (!previewId) return;
    setLoading(true);
    setError('');
    try {
      const resp = await DirectoryPreviewAdminAPI.getPreview(previewId);
      if (!resp) {
        throw new Error('Preview not found');
      }
      setPreview(resp);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewId]);

  const handleApply = async () => {
    if (!previewId) return;
    setApplying(true);
    setError('');
    try {
      const resp = await DirectoryPreviewAdminAPI.applyPreview(previewId);
      setApplyResult(resp);
      await loadPreview();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  const summaryRows = useMemo(
    () => [
      { label: 'Total rows', value: stats.totalRows ?? 0 },
      { label: 'Valid rows', value: stats.totalValid ?? 0 },
      { label: 'Invalid rows', value: stats.invalid ?? 0 },
      { label: 'Current active', value: diffCounts.currentActive ?? '—' },
    ],
    [stats, diffCounts]
  );

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Directory import preview</h1>
            <p className="text-gray-600">Review the pending changes before applying them to the directory.</p>
            {preview?.school_id && (
              <p className="text-sm text-gray-500">
                School: <span className="font-mono">{preview.school_id}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/directory-import')}
              className="text-sm text-blue-700 hover:underline"
            >
              Back to upload
            </button>
            <button
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={applying || loading || !previewId || Boolean(preview?.applied_at)}
              onClick={handleApply}
            >
              {preview?.applied_at ? 'Already applied' : applying ? 'Applying…' : 'Apply import'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Add" value={diffCounts.toAdd ?? 0} tone="green" />
          <StatBadge label="Update" value={diffCounts.toUpdate ?? 0} tone="amber" />
          <StatBadge label="Deactivate" value={diffCounts.toDeactivate ?? 0} tone="red" />
          <StatBadge label="Invalid" value={diffCounts.invalid ?? stats.invalid ?? 0} tone="gray" />
        </div>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {applyResult?.jobId && (
        <p className="text-sm text-green-700">
          Applied via job <span className="font-mono">{applyResult.jobId}</span>
        </p>
      )}

      <section className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Summary</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {summaryRows.map((row) => (
            <div key={row.label} className="bg-gray-50 rounded p-2">
              <dt className="text-gray-600">{row.label}</dt>
              <dd className="font-semibold text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Schema version: {preview?.schema_version ?? '—'}</p>
          <p>Created: {formatDate(preview?.created_at)}</p>
          <p>Expires: {formatDate(preview?.expires_at)}</p>
          {preview?.applied_at && <p>Applied at: {formatDate(preview?.applied_at)}</p>}
          <p>Deactivate missing: {preview?.deactivate_missing ? 'Yes' : 'No'}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SampleList
            title={`To add (${diffCounts.toAdd ?? 0})`}
            items={diffSamples.toAdd}
            renderItem={(item) => (
              <span className="flex items-center justify-between">
                <span className="font-mono">{item.email}</span>
                <span className="text-xs text-gray-600">{item.contact_type}</span>
              </span>
            )}
          />
          <SampleList
            title={`To update (${diffCounts.toUpdate ?? 0})`}
            items={diffSamples.toUpdate}
            renderItem={(item) => (
              <div className="flex flex-col">
                <span className="font-mono">{item.email}</span>
                <span className="text-xs text-gray-600">
                  {item.from || '—'} → <span className="font-semibold text-gray-800">{item.to}</span>
                  {item.wasInactive ? ' (reactivate)' : ''}
                </span>
              </div>
            )}
          />
          <SampleList
            title={`To deactivate (${diffCounts.toDeactivate ?? 0})`}
            items={diffSamples.toDeactivate}
            renderItem={(item) => (
              <span className="flex items-center justify-between">
                <span className="font-mono">{item.email}</span>
                <span className="text-xs text-gray-600">{item.contact_type || '—'}</span>
              </span>
            )}
          />
          <SampleList
            title={`Invalid rows (${diffCounts.invalid ?? stats.invalid ?? 0})`}
            items={diffSamples.invalid}
            renderItem={(item) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-700">Row {item.rowNumber}</span>
                  <span className="text-xs text-red-700">{item.reason}</span>
                </div>
                <div className="text-xs text-gray-600 flex gap-2">
                  {item.email && <span className="font-mono">{item.email}</span>}
                  {item.contact_type && <span>{item.contact_type}</span>}
                </div>
              </div>
            )}
          />
        </div>
      </section>

      {loading && <p className="text-sm text-gray-600">Loading preview…</p>}
    </div>
  );
}
