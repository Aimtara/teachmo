export default function TodayActionsCard({ items, onComplete, onDismiss, loading }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Today’s actions</h2>
          <p className="text-sm text-gray-600">Small, high-impact steps. Stop after one if you’re cooked.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 mt-3">Loading…</p>}

      {!loading && (!items || items.length === 0) && (
        <p className="text-sm text-gray-500 mt-3">No queued actions right now.</p>
      )}

      <ul className="mt-3 space-y-3">
        {(items || []).map((it) => (
          <li key={it.action.id} className="border rounded p-3">
            <p className="text-sm font-semibold">{it.action.title}</p>
            <p className="text-sm text-gray-600 mt-1">{it.action.summary}</p>
            <div className="mt-2 flex gap-2">
              <button
                className="px-3 py-1.5 rounded bg-black text-white text-sm disabled:opacity-60"
                onClick={() => onComplete(it.action.id)}
                disabled={loading}
              >
                Mark done
              </button>
              <button
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-60"
                onClick={() => onDismiss(it.action.id)}
                disabled={loading}
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
