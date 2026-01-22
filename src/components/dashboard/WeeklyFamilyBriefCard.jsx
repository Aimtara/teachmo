import { useMemo, useState } from 'react';
import WeeklyFamilyBriefModal from './WeeklyFamilyBriefModal';

export default function WeeklyFamilyBriefCard({ brief, onGenerate, loading }) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const steps = useMemo(() => {
    const arr = brief?.recommendedNextSteps || [];
    return expanded ? arr.slice(0, 5) : arr.slice(0, 2);
  }, [brief, expanded]);

  if (!brief) {
    return (
      <div className="bg-white shadow rounded p-4 md:col-span-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Weekly Family Brief</h2>
            <p className="text-sm text-gray-600">
              No brief yet. Generate one to get a calm, balanced plan for home + school.
            </p>
          </div>
          <button
            className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
            onClick={onGenerate}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate brief'}
          </button>
        </div>
      </div>
    );
  }

  const zone = brief.zoneSummary?.currentZone || 'green';
  const tensionPct = Math.round((brief.zoneSummary?.tension || 0) * 100);

  return (
    <div className="bg-white shadow rounded p-4 md:col-span-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">Weekly Family Brief</h2>
          <p className="text-sm text-gray-600">
            Zone: <span className="font-semibold">{zone}</span> · Tension: {tensionPct}%
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border text-sm" onClick={() => setModalOpen(true)}>
            View full brief
          </button>
          <button
            className="px-3 py-2 rounded border text-sm disabled:opacity-60"
            onClick={onGenerate}
            disabled={loading}
            title="Refresh with the latest signals"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold mb-2">Next steps (keep it tiny)</p>
          {brief.whyNow && (
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Why now:</span> {brief.whyNow}
            </p>
          )}
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            {steps.map((s, i) => (
              <li key={`${i}-${s}`}>{s}</li>
            ))}
          </ol>

          {(brief.recommendedNextSteps?.length || 0) > 2 && (
            <button
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show fewer steps' : 'Show more'}
            </button>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">What stood out</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {(brief.highlights || []).slice(0, 2).map((h, i) => (
              <li key={`${i}-${h}`}>• {h}</li>
            ))}
          </ul>

          <p className="text-sm font-semibold mt-3 mb-2">Watch-outs</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {(brief.risks || []).slice(0, 2).map((r, i) => (
              <li key={`${i}-${r}`}>• {r}</li>
            ))}
          </ul>
        </div>
      </div>

      <WeeklyFamilyBriefModal open={modalOpen} onClose={() => setModalOpen(false)} brief={brief} />
    </div>
  );
}
