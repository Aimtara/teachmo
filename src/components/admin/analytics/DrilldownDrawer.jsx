import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function DrilldownDrawer({ open, onOpenChange, metricKey, rows, onExportCsv, onExportPdf }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[720px] max-w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">Drill-down: {metricKey || 'events'}</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="secondary" onClick={onExportCsv}>Export CSV</Button>
          <Button variant="secondary" onClick={onExportPdf}>Export PDF</Button>
        </div>
        <div className="mt-4 space-y-2">
          {rows?.length ? (
            <div className="rounded-md border divide-y">
              {rows.map((row, idx) => (
                <div key={`${row.event_ts}-${idx}`} className="p-3">
                  <div className="text-sm font-medium">{row.event_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(row.event_ts).toLocaleString()}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div>Actor: {row.actor_id || '—'} ({row.actor_role || 'unknown'})</div>
                    <pre className="mt-1 whitespace-pre-wrap text-[11px] bg-muted rounded p-2">
                      {JSON.stringify(row.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No drill-down records available.</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
