import React, { useEffect, useState } from 'react';
import { Page, Card, Select, Textarea, Button } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminLogViewer
 * Simple unified log viewer that fetches logs from observability service.
 */
export default function AdminLogViewer() {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState('');
  const [level, setLevel] = useState('info');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await nhost.functions.call('admin-observability-get-logs', { level });
      setLogs(res?.logs || '');
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('view_logs')) {
      fetchLogs();
    }
  }, [hasPermission, level]);

  if (!hasPermission('view_logs')) {
    return (
      <Page title="Log Viewer">
        <p>You do not have permission to view logs.</p>
      </Page>
    );
  }

  return (
    <Page title="Log Viewer">
      <p>View aggregated logs across all services. Use the level dropdown to filter severity.</p>
      <Card className="p-4 mb-4">
        <Select
          label="Log Level"
          value={level}
          onChange={(e: any) => setLevel(e.target.value)}
          options={[
            { value: 'debug', label: 'Debug' },
            { value: 'info', label: 'Info' },
            { value: 'warn', label: 'Warning' },
            { value: 'error', label: 'Error' },
          ]}
        />
        <Button onClick={fetchLogs} disabled={loading}>
          Refresh
        </Button>
      </Card>
      <Textarea value={logs} readOnly rows={20} cols={80} />
    </Page>
  );
}
