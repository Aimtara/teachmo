export default function WeeklyFamilyBriefModal({ open, onClose, brief }) {
  if (!open || !brief) return null;

  const zone = brief.zoneSummary?.currentZone || 'green';
  const tensionPct = Math.round((brief.zoneSummary?.tension || 0) * 100);
  const slackPct = Math.round((brief.zoneSummary?.slack || 0) * 100);

  const counts = brief.signalCounts || {};
  const topCounts = Object.entries(counts)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />

      <div className="relative w-[min(900px,92vw)] max-h-[85vh] overflow-auto rounded bg-white shadow-lg">
        <div className="p-4 border-b flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Weekly Family Brief</h3>
            <p className="text-sm text-gray-600">
              Zone: <span className="font-semibold">{zone}</span> · Tension {tensionPct}% · Slack {slackPct}%
              {brief.zoneSummary?.cooldownActive ? ' · Cooldown active' : ''}
            </p>
          </div>

          <button className="px-3 py-2 rounded border text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-6">
          <section>
            <h4 className="font-semibold mb-2">Highlights</h4>
            <ul className="space-y-1 text-sm text-gray-800">
              {(brief.highlights || []).map((h, i) => (
                <li key={`h-${i}`}>• {h}</li>
              ))}
            </ul>

            <h4 className="font-semibold mt-5 mb-2">Watch-outs</h4>
            <ul className="space-y-1 text-sm text-gray-800">
              {(brief.risks || []).map((r, i) => (
                <li key={`r-${i}`}>• {r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="font-semibold mb-2">Recommended next steps</h4>
            <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-800">
              {(brief.recommendedNextSteps || []).map((s, i) => (
                <li key={`s-${i}`}>{s}</li>
              ))}
            </ol>

            <h4 className="font-semibold mt-5 mb-2">Signals (top)</h4>
            <div className="text-sm text-gray-800 space-y-1">
              {topCounts.length === 0 && <p className="text-gray-500">No signal counts available.</p>}
              {topCounts.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1 last:border-0">
                  <span className="text-gray-600">{k.replaceAll('_', ' ')}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>

            {brief.setpointAdjustments && (
              <>
                <h4 className="font-semibold mt-5 mb-2">System tuning</h4>
                <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto">
                  {JSON.stringify(brief.setpointAdjustments, null, 2)}
                </pre>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
