import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsEventsTable({ title, rows }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows?.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.event_ts).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.event_name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.actor_user_id ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.entity_type ? `${r.entity_type}:${r.entity_id ?? ''}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <pre className="max-w-[520px] overflow-auto text-[11px] leading-snug text-muted-foreground">
                        {JSON.stringify(r.metadata ?? {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                    No events to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
