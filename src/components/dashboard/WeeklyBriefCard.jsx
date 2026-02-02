import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { weeklyBriefsApi } from '@/domain/weeklyBriefs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceAssistant from '@/components/shared/VoiceAssistant';

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

  const weekLabel = brief?.brief_content?.weekOf
    ? `Week of ${formatWeekLabel(brief.brief_content.weekOf)}`
    : 'Your weekly summary';

  const topItems = (brief?.brief_content?.whatMattersMost || []).slice(0, 3);
  const goodToKnowItems = (brief?.brief_content?.goodToKnow || []).slice(0, 3);
  const optionalItems = (brief?.brief_content?.optionalIfYouHaveTime || []).slice(0, 2);

  const readAloudText = brief
    ? `Here is your weekly brief. ${weekLabel}. ${
        topItems.length ? `What matters most: ${topItems.map((item) => item.text).join(', ')}.` : ''
      } ${
        goodToKnowItems.length ? `Good to know: ${goodToKnowItems.map((item) => item.text).join(', ')}.` : ''
      }`
    : 'Loading your weekly brief.';

  return (
    <Card className="border-l-4 border-l-brand-blue bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-gold" />
            <CardTitle className="text-lg font-heading text-brand-slate">Weekly Brief</CardTitle>
          </div>
          <p className="text-sm text-gray-500">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {brief?.id && (
            <Link
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              to={`/briefs/${brief.id}`}
            >
              Show everything
            </Link>
          )}
          <VoiceAssistant text={readAloudText} label="Listen to Brief" variant="icon" />
        </div>
      </CardHeader>

      <CardContent>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && !brief && (
          <p className="text-sm text-gray-500">
            No weekly brief yet. Once your school posts updates, Teachmo will summarize them here.
          </p>
        )}

        {!loading && !error && brief && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">What matters most</p>
              <ul className="mt-2 space-y-2 text-sm">
                {topItems.map((item, idx) => (
                  <li key={`${brief.id}-core-${idx}`} className="border-b pb-2 last:border-0 last:pb-0">
                    <p className="font-semibold">{item.text}</p>
                    <div className="flex flex-wrap gap-x-2 text-gray-500">
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

            {goodToKnowItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Good to know</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {goodToKnowItems.map((item, idx) => (
                    <li key={`${brief.id}-gtk-${idx}`}>• {item.text}</li>
                  ))}
                </ul>
              </div>
            )}

            {brief.mediation_level !== 'HIGH' && optionalItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Optional if you have time</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {optionalItems.map((item, idx) => (
                    <li key={`${brief.id}-opt-${idx}`}>• {item.text}</li>
                  ))}
                </ul>
              </div>
            )}

            {brief.brief_content.teachmoNote ? (
              <p className="text-sm italic text-gray-600">{brief.brief_content.teachmoNote}</p>
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
      </CardContent>
    </Card>
  );
}
