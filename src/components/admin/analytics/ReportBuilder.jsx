import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { exportReportCsv, exportReportPdf, runReport } from '@/api/analytics/client';
import { useToast } from '@/hooks/use-toast';

const PRESETS = [
  {
    id: 'messages_by_school',
    name: 'Messages by school',
    description: 'Counts message_sent events grouped by school_id.',
    definition: {
      kind: 'aggregate',
      source: 'analytics_events',
      groupBy: ['school_id'],
      measures: [{ op: 'count', as: 'messages_sent' }],
      where: { event_name: 'message_sent' }
    }
  },
  {
    id: 'workflow_runs_by_org',
    name: 'Workflow runs by org',
    description: 'Automation executions grouped by school_id and status.',
    definition: {
      kind: 'aggregate',
      source: 'workflow_runs',
      groupBy: ['school_id', 'status'],
      measures: [{ op: 'count', as: 'runs' }]
    }
  }
];

export default function ReportBuilder({ tenant, filters }) {
  const { toast } = useToast();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId) || PRESETS[0], [presetId]);
  const [definitionText, setDefinitionText] = useState(JSON.stringify(preset.definition, null, 2));
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setDefinitionText(JSON.stringify(preset.definition, null, 2));
  }, [preset]);

  async function handleRun() {
    try {
      const definition = JSON.parse(definitionText);
      const res = await runReport(tenant, definition, filters);
      setRows(res.rows || []);
    } catch (err) {
      toast({ title: 'Report error', description: String(err) });
    }
  }

  async function handleExport(kind) {
    try {
      const definition = JSON.parse(definitionText);
      const blob = kind === 'csv'
        ? await exportReportCsv(tenant, definition, filters)
        : await exportReportPdf(tenant, definition, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'csv' ? 'teachmo-report.csv' : 'teachmo-report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Export failed', description: String(err) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custom reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Templates</label>
            <Select value={presetId} onValueChange={setPresetId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Definition</label>
            <Textarea
              rows={8}
              value={definitionText}
              onChange={(e) => setDefinitionText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleRun}>Run report</Button>
          <Button variant="secondary" onClick={() => handleExport('csv')}>Export CSV</Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')}>Export PDF</Button>
        </div>

        <div className="rounded-md border">
          {rows.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(rows[0]).map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {Object.keys(rows[0]).map((header) => (
                        <td key={header} className="px-3 py-2">
                          {row[header] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Run a report to see results.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
