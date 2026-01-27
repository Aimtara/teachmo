import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const logger = createLogger('AdminRealtimeSIS');

/**
 * AdminRealtimeSIS lets administrators configure realtime or scheduled roster sync
 * with external SIS/LMS providers.  It fetches current sync settings and recent
 * job statuses, allows selecting a provider and sync mode (manual, hourly, daily,
 * realtime webhook), and triggers immediate sync runs.  Role assignment is
 * handled automatically via SIS role mapping.
 */
export default function AdminRealtimeSIS() {
  const [provider, setProvider] = useState('');
  const [mode, setMode] = useState('hourly');
  const [loading, setLoading] = useState(false);

  const { data: configData, refetch } = useQuery(
    ['sisSyncConfig'],
    async () => {
      const query = `query GetSISSyncConfig { sis_sync_config { provider mode } sis_sync_jobs(order_by: {created_at: desc}, limit: 10) { id provider mode status created_at } }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (configData?.sis_sync_config?.length) {
      const cfg = configData.sis_sync_config[0];
      setProvider(cfg.provider || '');
      setMode(cfg.mode || 'hourly');
    }
  }, [configData]);

  const updateSync = async () => {
    setLoading(true);
    try {
      const mutation = `mutation UpsertSISSyncConfig($provider: String!, $mode: String!) { insert_sis_sync_config_one(object: {provider: $provider, mode: $mode}, on_conflict: {constraint: sis_sync_config_pkey, update_columns: [mode]}) { provider mode } }`;
      await graphqlRequest(mutation, { provider, mode });
      toast.success('Sync settings saved');
      await refetch();
    } catch (err) {
      logger.error('Failed to update sync config', err);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const runSync = async () => {
    setLoading(true);
    try {
      const mutation = `mutation RunSISSync($provider: String!) { run_sis_sync(provider: $provider) { message } }`;
      await graphqlRequest(mutation, { provider });
      toast.success('Sync job started');
      await refetch();
    } catch (err) {
      logger.error('Failed to run sync job', err);
      toast.error('Failed to start sync job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Realtime SIS/LMS Sync</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">Select provider</option>
              <option value="oneroster">OneRoster CSV</option>
              <option value="classlink">ClassLink</option>
              <option value="clever">Clever</option>
              <option value="google">Google Classroom</option>
              <option value="canvas">Canvas LMS</option>
              <option value="schoology">Schoology</option>
            </Select>
          </div>
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">Sync Mode</label>
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="manual">Manual only</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="realtime">Realtime (Webhook)</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={updateSync} disabled={loading}>
              Save Settings
            </Button>
            <Button onClick={runSync} disabled={loading} variant="secondary">
              Run Sync Now
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Role mapping is automatically applied based on SIS roles configured in the SIS Role
            Mapping page. Realtime webhook mode will listen for roster change events from your LMS
            provider.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configData?.sis_sync_jobs?.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.id}</TableCell>
                  <TableCell>{job.provider}</TableCell>
                  <TableCell>{job.mode}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
