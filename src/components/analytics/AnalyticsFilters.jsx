import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AnalyticsFilters({ value, onChange, onRefresh, onExportCsv, onExportPdf }) {
  const { from, to, role, eventName } = value;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters & export</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">From</div>
            <Input
              type="date"
              value={from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">To</div>
            <Input
              type="date"
              value={to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Actor role</div>
            <Select value={role ?? 'all'} onValueChange={(v) => onChange({ ...value, role: v === 'all' ? null : v })}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="school_admin">School admin</SelectItem>
                <SelectItem value="district_admin">District admin</SelectItem>
                <SelectItem value="system_admin">System admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Event contains</div>
            <Input
              placeholder="e.g. message_sent"
              value={eventName ?? ''}
              onChange={(e) => onChange({ ...value, eventName: e.target.value || null })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRefresh}>Refresh</Button>
          <Button variant="outline" onClick={onExportCsv}>Export CSV</Button>
          <Button variant="outline" onClick={onExportPdf}>Export PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}
