import React, { useEffect, useState } from 'react';
import { Page, Card, Button, Select, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminSISSync
 * This page allows administrators to configure and trigger roster synchronization with SIS/LMS providers.
 * Admins can select providers (OneRoster, ClassLink, Clever, Google Classroom) and schedule regular syncs.
 */
export default function AdminSISSync() {
  const { hasPermission } = usePermissions();
  const [jobs, setJobs] = useState<any[]>([]);
  const [frequency, setFrequency] = useState('daily');
  const [provider, setProvider] = useState('oneroster');
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query ListRosterJobs {
            sis_sync_jobs(order_by: { created_at: desc }, limit: 10) {
              id
              provider
              frequency
              status
              created_at
              last_run_at
              next_run_at
            }
          }
        `,
        {}
      );
      setJobs(res?.sis_sync_jobs || []);
    } catch (err) {
      console.error('Failed to load roster jobs', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_sis_sync')) {
      loadJobs();
    }
  }, [hasPermission]);

  const scheduleSync = async () => {
    setLoading(true);
    try {
      await nhost.functions.call('admin-sis-schedule-sync', { provider, frequency });
      loadJobs();
    } catch (err) {
      console.error('Failed to schedule sync', err);
    } finally {
      setLoading(false);
    }
  };

  const runSyncNow = async () => {
    setLoading(true);
    try {
      await nhost.functions.call('admin-sis-run-sync', { provider });
      loadJobs();
    } catch (err) {
      console.error('Failed to run sync', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('manage_sis_sync')) {
    return (
      <Page title="SIS & LMS Sync">
        <p>You do not have permission to manage SIS/LMS synchronization.</p>
      </Page>
    );
  }

  return (
    <Page title="SIS & LMS Sync">
      <p>Schedule and monitor real-time roster synchronization jobs with external student information systems.</p>
      <Card className="p-4 mb-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Provider"
            value={provider}
            onChange={(e: any) => setProvider(e.target.value)}
            options={[
              { value: 'oneroster', label: 'OneRoster CSV' },
              { value: 'classlink', label: 'ClassLink' },
              { value: 'clever', label: 'Clever' },
              { value: 'google', label: 'Google Classroom' },
            ]}
          />
          <Select
            label="Frequency"
            value={frequency}
            onChange={(e: any) => setFrequency(e.target.value)}
            options={[
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
        </div>
        <div className="flex space-x-2">
          <Button onClick={scheduleSync} disabled={loading}>Schedule Sync</Button>
          <Button variant="secondary" onClick={runSyncNow} disabled={loading}>Run Now</Button>
        </div>
      </Card>
      <h3 className="text-lg font-semibold mb-2">Recent Sync Jobs</h3>
      <Table
        data={jobs}
        columns={[
          { Header: 'Provider', accessor: 'provider' },
          { Header: 'Frequency', accessor: 'frequency' },
          { Header: 'Status', accessor: 'status' },
          { Header: 'Last Run', accessor: 'last_run_at' },
          { Header: 'Next Run', accessor: 'next_run_at' },
        ]}
      />
    </Page>
  );
}
