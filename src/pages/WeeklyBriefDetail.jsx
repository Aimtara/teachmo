import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { weeklyBriefsApi } from '@/domain/weeklyBriefs';

function formatISODate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
}

export default function WeeklyBriefDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brief, setBrief] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!id) {
        navigate('/parent/dashboard', { replace: true });
        return;
      }
      setLoading(true);
      setError('');
      try {
        const row = await weeklyBriefsApi.get(id);
        if (!isMounted) return;
        setBrief(row);
        weeklyBriefsApi.logView(id, 'dashboard').catch(() => {});
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
  }, [id, navigate]);

  const content = brief?.brief_content;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{content?.title || 'This Week at School'}</h1>
          <p className="text-gray-600">
            {content?.weekOf ? `Week of ${formatISODate(content.weekOf)}` : ''}
          </p>
        </div>
        <Link
          to="/parent/dashboard"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Back to dashboard
        </Link>
      </header>

      {loading && <p className="text-gray-600">Loading…</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}

      {!loading && !error && brief && (
        <div className="bg-white shadow rounded p-6 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              What matters most
            </h2>
            <ul className="mt-3 space-y-3">
              {(content?.whatMattersMost || []).map((item, idx) => (
                <li key={`${brief.id}-core-${idx}`} className="border-b pb-3 last:border-0 last:pb-0">
                  <p className="font-semibold">{item.text}</p>
                  <p className="text-sm text-gray-600">
                    {item.etaMinutes ? `~${item.etaMinutes} min` : null}
                    {item.etaMinutes && item.why ? ' · ' : null}
                    {item.why || null}
                  </p>
                </li>
              ))}
              {(content?.whatMattersMost || []).length === 0 && (
                <li className="text-gray-500">No core items detected for this week.</li>
              )}
            </ul>
          </section>

          {(content?.goodToKnow || []).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Good to know</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {(content.goodToKnow || []).map((item, idx) => (
                  <li key={`${brief.id}-gtk-${idx}`}>• {item.text}</li>
                ))}
              </ul>
            </section>
          )}

          {brief.mediation_level !== 'HIGH' && (content?.optionalIfYouHaveTime || []).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Optional if you have time
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {(content.optionalIfYouHaveTime || []).map((item, idx) => (
                  <li key={`${brief.id}-opt-${idx}`}>• {item.text}</li>
                ))}
              </ul>
            </section>
          )}

          {content?.teachmoNote ? (
            <section className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-700 italic">{content.teachmoNote}</p>
            </section>
          ) : null}

          <section className="pt-2 border-t">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Technical details (for debugging)
              </summary>
              <div className="mt-3 text-sm text-gray-600 space-y-1">
                <p>
                  Mediation: <span className="font-mono">{brief.mediation_level}</span>
                </p>
                <p>
                  SLS / HCS / TI:{' '}
                  <span className="font-mono">{brief.school_load_score} / {brief.home_capacity_score} / {brief.tension_index}</span>
                </p>
                <p>
                  Views: <span className="font-mono">{brief.view_count}</span>
                </p>
              </div>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
