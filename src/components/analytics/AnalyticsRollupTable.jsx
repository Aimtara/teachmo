import { cn } from '@/lib/utils';

export function AnalyticsRollupTable({ rows, onSelectEvent, selectedEventName }) {
  if (!rows?.length) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">No rollup rows for this range.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 font-medium">Day</th>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">School</th>
            <th className="px-3 py-2 text-right font-medium">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelected = selectedEventName && r.event_name === selectedEventName;
            return (
              <tr
                key={`${r.day}-${r.event_name}-${r.school_id ?? 'null'}`}
                className={cn(
                  'border-b last:border-0',
                  onSelectEvent ? 'cursor-pointer hover:bg-muted/40' : '',
                  isSelected ? 'bg-muted/30' : ''
                )}
                onClick={() => onSelectEvent?.(r.event_name)}
              >
                <td className="px-3 py-2 whitespace-nowrap">{r.day}</td>
                <td className="px-3 py-2">{r.event_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.school_id ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.event_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
