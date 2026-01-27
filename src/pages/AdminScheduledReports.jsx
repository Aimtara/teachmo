import React, { useEffect, useState } from 'react';
import { Page, Card, Button, Select, TextInput, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminScheduledReports
 * Provides an interface for administrators to create and manage scheduled analytics reports and subscriptions.
 */
export default function AdminScheduledReports() {
  const { hasPermission } = usePermissions();
  const [reports, setReports] = useState<any[]>([]);
  const [newReport, setNewReport] = useState<any>({
    name: '',
    interval: 'daily',
    format: 'csv',
    metrics: 'usage',
    recipients: '',
  });
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query ListScheduledReports {
            scheduled_reports {
              id
              name
              interval
              format
              metrics
              recipients
              next_run_at
            }
          }
        `,
        {}
      );
      setReports(res?.scheduled_reports || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_reports')) {
      loadReports();
    }
  }, [hasPermission]);

  const createReport = async () => {
    setLoading(true);
    try {
      await nhost.graphql.request(
        `
          mutation CreateReport($object: scheduled_reports_insert_input!) {
            insert_scheduled_reports_one(object: $object) { id }
          }
        `,
        { object: newReport }
      );
      setNewReport({ name: '', interval: 'daily', format: 'csv', metrics: 'usage', recipients: '' });
      loadReports();
    } catch (err) {
      console.error('Failed to create report', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelReport = async (id: string) => {
    try {
      await nhost.graphql.request(
        `
          mutation CancelReport($id: uuid!) {
            delete_scheduled_reports_by_pk(id: $id) { id }
          }
        `,
        { id }
      );
      loadReports();
    } catch (err) {
      console.error('Failed to cancel report', err);
    }
  };

  if (!hasPermission('manage_reports')) {
    return (
      <Page title="Scheduled Reports">
        <p>You do not have permission to manage scheduled reports.</p>
      </Page>
    );
  }

  return (
    <Page title="Scheduled Reports">
      <p>Create and manage scheduled analytics reports delivered via email.</p>
      <Card className="p-4 space-y-3 mb-4">
        <h3 className="text-lg font-semibold">Create Report</h3>
        <TextInput
          label="Name"
          value={newReport.name}
          onChange={(e: any) => setNewReport({ ...newReport, name: e.target.value })}
        />
        <Select
          label="Interval"
          value={newReport.interval}
          onChange={(e: any) => setNewReport({ ...newReport, interval: e.target.value })}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
        <Select
          label="Format"
          value={newReport.format}
          onChange={(e: any) => setNewReport({ ...newReport, format: e.target.value })}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'pdf', label: 'PDF' },
          ]}
        />
        <Select
          label="Metrics"
          value={newReport.metrics}
          onChange={(e: any) => setNewReport({ ...newReport, metrics: e.target.value })}
          options={[
            { value: 'usage', label: 'Usage' },
            { value: 'engagement', label: 'Engagement' },
            { value: 'retention', label: 'Retention' },
            { value: 'cohort', label: 'Cohort Analysis' },
          ]}
        />
        <TextInput
          label="Recipients (comma separated)"
          value={newReport.recipients}
          onChange={(e: any) => setNewReport({ ...newReport, recipients: e.target.value })}
        />
        <Button onClick={createReport} disabled={loading}>Create Report</Button>
      </Card>
      <h3 className="text-lg font-semibold mb-2">Existing Reports</h3>
      <Table
        data={reports}
        columns={[
          { Header: 'Name', accessor: 'name' },
          { Header: 'Interval', accessor: 'interval' },
          { Header: 'Format', accessor: 'format' },
          { Header: 'Metrics', accessor: 'metrics' },
          { Header: 'Next Run', accessor: 'next_run_at' },
          {
            Header: 'Actions',
            accessor: 'actions',
            Cell: ({ row }: any) => (
              <Button variant="danger" onClick={() => cancelReport(row.original.id)}>
                Cancel
              </Button>
            ),
          },
        ]}
      />
    </Page>
  );
}
