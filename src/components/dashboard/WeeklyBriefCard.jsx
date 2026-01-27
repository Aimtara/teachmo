import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { weeklyBriefsApi } from '@/domain/weeklyBriefs';

function startOfWeekISO(date = new Date()) {
  // ISO week starts Monday.
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekOfISO) {
  try {
    const d = new Date(weekOfISO);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return weekOfISO;
  }
}

export default function WeeklyBriefCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brief, setBrief] = useState(null);

  const weekStart = useMemo(() => startOfWeekISO(new Date()), []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const briefs = await weeklyBriefsApi.list({ weekStart });
        if (!isMounted) return;
        // Prefer most recently published brief.
        const published = briefs.filter((b) => b.status === 'PUBLISHED');
        const candidate = (published.length > 0 ? published : briefs)
          .slice()
          .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))[0] || null;
        setBrief(candidate);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || 'Unable to load weekly brief');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [weekStart]);

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">This Week at School</h2>
          <p className="text-sm text-gray-500">
            {brief?.brief_content?.weekOf ? `Week of ${formatWeekLabel(brief.brief_content.weekOf)}` : 'Your weekly summary'}
          </p>
        </div>
        {brief?.id && (
          <Link
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            to={`/briefs/${brief.id}`}
          >
            Show everything
          </Link>
        )}
      </div>

      {loading && <p className="mt-3 text-sm text-gray-500">Loading…</p>}
      {!loading && error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!loading && !error && !brief && (
        <p className="mt-3 text-sm text-gray-500">
          No weekly brief yet. Once your school posts updates, Teachmo will summarize them here.
        </p>
      )}

      {!loading && !error && brief && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">What matters most</p>
            <ul className="mt-2 space-y-2 text-sm">
              {(brief.brief_content.whatMattersMost || []).slice(0, 3).map((item, idx) => (
                <li key={`${brief.id}-core-${idx}`} className="border-b pb-2 last:border-0 last:pb-0">
                  <p className="font-semibold">{item.text}</p>
                  <div className="text-gray-500 flex flex-wrap gap-x-2">
                    {item.etaMinutes ? <span>~{item.etaMinutes} min</span> : null}
                    {item.why ? <span>· {item.why}</span> : null}
                  </div>
                </li>
              ))}
              {(brief.brief_content.whatMattersMost || []).length === 0 && (
                <li className="text-gray-500">No core items detected for this week.</li>
              )}
            </ul>
          </div>

          {(brief.brief_content.goodToKnow || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Good to know</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {(brief.brief_content.goodToKnow || []).slice(0, 3).map((item, idx) => (
                  <li key={`${brief.id}-gtk-${idx}`}>• {item.text}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.mediation_level !== 'HIGH' && (brief.brief_content.optionalIfYouHaveTime || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Optional if you have time</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {(brief.brief_content.optionalIfYouHaveTime || []).slice(0, 2).map((item, idx) => (
                  <li key={`${brief.id}-opt-${idx}`}>• {item.text}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.brief_content.teachmoNote ? (
            <p className="text-sm text-gray-600 italic">{brief.brief_content.teachmoNote}</p>
          ) : null}

          {brief?.id && (
            <div>
              <Link
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                to={`/briefs/${brief.id}`}
              >
                Open brief
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
