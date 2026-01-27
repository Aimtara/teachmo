import React, { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const logger = createLogger('AdminReportSubscriptions');

export default function AdminReportSubscriptions() {
  const [email, setEmail] = useState('');
  const [reportId, setReportId] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const { data, refetch } = useQuery(
    ['scheduledReports'],
    async () => {
      const query = `query ScheduledReports {
        scheduled_reports(order_by: {created_at: desc}) {
          id name interval format metrics recipients { email }
        }
      }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  const handleSubscribe = async () => {
    if (!email || !reportId) {
      toast.error('Please select a report and enter an email');
      return;
    }
    setSubscribing(true);
    try {
      const mutation = `mutation Subscribe($reportId: uuid!, $email: String!) {
        insert_scheduled_report_recipients_one(object: {report_id: $reportId, email: $email}, on_conflict: {constraint: scheduled_report_recipients_pkey, update_columns: []}) {
          email
        }
      }`;
      await graphqlRequest(mutation, { reportId, email });
      toast.success('User subscribed');
      setEmail('');
      await refetch();
    } catch (err) {
      logger.error('Failed to subscribe user', err);
      toast.error('Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (rId, userEmail) => {
    try {
      const mutation = `mutation Unsubscribe($reportId: uuid!, $email: String!) {
        delete_scheduled_report_recipients_by_pk(report_id: $reportId, email: $email) { email }
      }`;
      await graphqlRequest(mutation, { reportId: rId, email: userEmail });
      toast.success('User unsubscribed');
      await refetch();
    } catch (err) {
      logger.error('Failed to unsubscribe', err);
      toast.error('Unsubscribe failed');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Report Subscriptions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Subscribe User to Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report</label>
              <Select value={reportId} onChange={(e) => setReportId(e.target.value)}>
                <option value="">Select a report</option>
                {data?.scheduled_reports?.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">User Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <Button onClick={handleSubscribe} disabled={subscribing}>
              Subscribe
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.scheduled_reports?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead>Recipients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.scheduled_reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.name}</TableCell>
                    <TableCell>{report.interval}</TableCell>
                    <TableCell>{report.format}</TableCell>
                    <TableCell>{report.metrics.join(', ')}</TableCell>
                    <TableCell>
                      {report.recipients.length === 0 && (
                        <p className="text-sm text-muted-foreground">No recipients</p>
                      )}
                      <div className="space-y-2">
                        {report.recipients.map((r) => (
                          <div key={r.email} className="flex items-center gap-2">
                            <span className="text-sm">{r.email}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUnsubscribe(report.id, r.email)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No scheduled reports yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
