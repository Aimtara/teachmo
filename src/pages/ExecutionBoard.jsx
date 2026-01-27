import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { API_BASE_URL } from '@/config/api';

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseChecklist(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const checked = line.startsWith('☑');
      const text = line.replace(/^☐\s*/, '').replace(/^☑\s*/, '').trim();
      return { checked, text };
    });
}

export default function ExecutionBoard() {
  const { isAuthenticated } = useAuthenticationStatus();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);

  const [tagFilter, setTagFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [segmentFilter, setSegmentFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = searchParams.get('q');
    if (q) setSearch(q);

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/execution-board`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBoard(data);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated, searchParams]);

  const epics = board?.epics || [];
  const gates = board?.gates || [];
  const slices = board?.slices || [];

  const tagOptions = useMemo(() => {
    const set = new Set(epics.map((e) => e.Tag).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [epics]);

  const statusOptions = useMemo(() => {
    const set = new Set(epics.map((e) => e.Status).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [epics]);

  const segmentOptions = useMemo(() => {
    const set = new Set(epics.map((e) => e['Rail Segment']).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [epics]);

  const filteredEpics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return epics
      .filter((e) => (tagFilter === 'All' ? true : e.Tag === tagFilter))
      .filter((e) => (statusFilter === 'All' ? true : e.Status === statusFilter))
      .filter((e) => (segmentFilter === 'All' ? true : e['Rail Segment'] === segmentFilter))
      .filter((e) => {
        if (!q) return true;
        const hay = [e['Epic ID'], e.Workstream, e['Owner (Role)'], e.Notes, e['Rail Segment']]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a['Epic ID']).localeCompare(String(b['Epic ID'])));
  }, [epics, tagFilter, statusFilter, segmentFilter, search]);

  const epicById = useMemo(() => {
    const map = new Map();
    epics.forEach((e) => {
      if (e['Epic ID']) map.set(e['Epic ID'], e);
    });
    return map;
  }, [epics]);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Single execution board</h1>
        <p className="text-gray-600">
          One place to see gates → epics → slices → dependencies. Source:{' '}
          <span className="font-medium">{board?.source || 'executionBoard.json'}</span>
        </p>
      </header>

      {loading && <p className="text-gray-600">Loading board…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          <p className="font-semibold">Couldn’t load the execution board.</p>
          <p className="text-sm opacity-90">{error.message}</p>
          <p className="mt-2 text-sm">
            Make sure the backend is running and{' '}
            <code className="rounded bg-red-100 px-1 py-0.5">/api/execution-board</code> is reachable.
          </p>
        </div>
      )}

      {!loading && !error && board && (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gates.map((gate) => {
              const items = parseChecklist(gate['Exit criteria checklist (tick when done)']);
              const checkedCount = items.filter((i) => i.checked).length;
              const progress = items.length ? Math.round((checkedCount / items.length) * 100) : null;

              return (
                <div key={gate.Gate} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {gate.Gate}: {gate.Purpose}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">Owner: {gate['Owner (Role)'] || '—'}</p>
                    </div>
                    <span className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-700">
                      {gate.Status || '—'}
                    </span>
                  </div>

                  {progress !== null && (
                    <p className="mt-2 text-xs text-gray-600">
                      Checklist: {checkedCount}/{items.length} ({progress}%)
                    </p>
                  )}

                  {items.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {items.slice(0, 6).map((item) => (
                        <li key={item.text} className="flex gap-2 text-xs text-gray-700">
                          <span aria-hidden="true">{item.checked ? '☑' : '☐'}</span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                      {items.length > 6 && (
                        <li className="text-xs text-gray-500">+ {items.length - 6} more</li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-gray-900">Epics</h2>
                <p className="text-sm text-gray-600">
                  Filter by tag (MVP shipping / Pilot hardening / Enterprise scale / R&amp;D), segment, and status.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">Tag</span>
                  <select
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                  >
                    {tagOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">Segment</span>
                  <select
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={segmentFilter}
                    onChange={(e) => setSegmentFilter(e.target.value)}
                  >
                    {segmentOptions.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">Status</span>
                  <select
                    className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-700 sm:min-w-[240px]">
                  <span className="block text-xs text-gray-500">Search</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Workstream, owner, notes…"
                  />
                </label>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-3 py-2">Epic</th>
                    <th className="px-3 py-2">Workstream</th>
                    <th className="px-3 py-2">Tag</th>
                    <th className="px-3 py-2">Segment</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Depends on</th>
                    <th className="px-3 py-2">Unlocks</th>
                    <th className="px-3 py-2">Commands</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEpics.map((epic) => {
                    const upstream = toArray(epic['Upstream Dependencies (IDs)']);
                    const downstream = toArray(epic['Downstream Dependencies (IDs)']);
                    const epicId = epic['Epic ID'];
                    const workstream = epic.Workstream || '';
                    const prefillUrl = (type, title, payloadObj) => {
                      const payload = encodeURIComponent(JSON.stringify(payloadObj ?? {}, null, 2));
                      return `/internal/command-center?type=${encodeURIComponent(type)}&title=${encodeURIComponent(
                        title
                      )}&payload=${payload}`;
                    };

                    return (
                      <tr
                        key={epic['Epic ID']}
                        id={`epic-${epic['Epic ID']}`}
                        className="rounded-lg bg-slate-50 text-sm text-gray-800"
                      >
                        <td className="whitespace-nowrap px-3 py-3 align-top font-semibold text-gray-900">
                          {epic['Epic ID']}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-gray-900">{epic.Workstream}</div>
                          {epic['Next milestone'] && (
                            <div className="mt-1 text-xs text-gray-600">{epic['Next milestone']}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top">
                          <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs">
                            {epic.Tag || '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-gray-700">
                          {epic['Rail Segment'] || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top">
                          <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs">
                            {epic.Status || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {upstream.length === 0 && <span className="text-xs text-gray-500">—</span>}
                            {upstream.map((id) => (
                              <a
                                key={id}
                                href={`#epic-${id}`}
                                className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-slate-100"
                                title={epicById.get(id)?.Workstream || id}
                              >
                                {id}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {downstream.length === 0 && <span className="text-xs text-gray-500">—</span>}
                            {downstream.map((id) => (
                              <a
                                key={id}
                                href={`#epic-${id}`}
                                className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-slate-100"
                                title={epicById.get(id)?.Workstream || id}
                              >
                                {id}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-slate-100"
                              to={prefillUrl(
                                'RUNBOOK_CREATE',
                                `${epicId}: ${workstream}`,
                                {
                                  incident: `Execution Board epic ${epicId}`,
                                  service: workstream,
                                  severity: 'warn',
                                  upstream,
                                  downstream,
                                  anchor: `/internal/execution-board#epic-${epicId}`
                                }
                              )}
                            >
                              Runbook
                            </Link>
                            <Link
                              className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-slate-100"
                              to={prefillUrl(
                                'ESCALATE',
                                `${epicId}: Decision / escalation`,
                                {
                                  severity: 'warn',
                                  target: 'slack',
                                  message: `Need a decision/escalation on ${epicId} (${workstream}).`,
                                  anchor: `/internal/execution-board#epic-${epicId}`
                                }
                              )}
                            >
                              Escalate
                            </Link>
                            <Link
                              className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 hover:bg-slate-100"
                              to={prefillUrl(
                                'ROLLBACK',
                                `${epicId}: Rollback`,
                                {
                                  deployment: '',
                                  reason: `Rollback request linked to epic ${epicId} (${workstream}).`,
                                  anchor: `/internal/execution-board#epic-${epicId}`
                                }
                              )}
                            >
                              Rollback
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredEpics.length === 0 && (
                <p className="mt-4 text-sm text-gray-600">No epics match the current filters.</p>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Slices</h2>
            <p className="text-sm text-gray-600">
              Thin end-to-end slices that prove each epic works in reality (and not just in Jira fanfic).
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {slices.map((slice) => (
                <div key={slice['Slice ID']} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {slice['Slice ID']} · {slice['Primary Epic']}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">{slice['Outcome (end-to-end)']}</p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs">
                      {slice.Status || '—'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-gray-700">
                    {slice.Deliverables && (
                      <p>
                        <span className="font-semibold">Deliverables:</span> {slice.Deliverables}
                      </p>
                    )}
                    {slice['Acceptance tests'] && (
                      <p>
                        <span className="font-semibold">Tests:</span> {slice['Acceptance tests']}
                      </p>
                    )}
                    {toArray(slice['Depends on slice IDs']).length > 0 && (
                      <p>
                        <span className="font-semibold">Depends on:</span>{' '}
                        {toArray(slice['Depends on slice IDs']).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
