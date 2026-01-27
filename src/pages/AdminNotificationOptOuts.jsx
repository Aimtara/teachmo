import React, { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const logger = createLogger('AdminNotificationOptOuts');

export default function AdminNotificationOptOuts() {
  const [search, setSearch] = useState('');
  const { data, refetch } = useQuery(
    ['notificationOptOuts'],
    async () => {
      const query = `query OptOuts {
        notification_opt_outs(order_by: {created_at: desc}) { email phone created_at }
      }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  const handleRemove = async (email, phone) => {
    try {
      const mutation = `mutation RemoveOptOut($email: String, $phone: String) {
        delete_notification_opt_outs(where: { _or: [{email: {_eq: $email}}, {phone: {_eq: $phone}}] }) { affected_rows }
      }`;
      await graphqlRequest(mutation, { email, phone });
      toast.success('User re-subscribed');
      await refetch();
    } catch (err) {
      logger.error('Failed to remove opt-out', err);
      toast.error('Failed to remove');
    }
  };

  const filtered = data?.notification_opt_outs?.filter((o) => {
    const q = search.toLowerCase();
    return o.email?.toLowerCase().includes(q) || o.phone?.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Notification Opt-Outs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Search & Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Search by email or phone</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="user@example.com or +15555555555"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Unsubscribed Users</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered && filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Opt-Out Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((opt) => (
                  <TableRow key={`${opt.email}-${opt.phone}`}>
                    <TableCell>{opt.email || '-'}</TableCell>
                    <TableCell>{opt.phone || '-'}</TableCell>
                    <TableCell>{new Date(opt.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" onClick={() => handleRemove(opt.email, opt.phone)}>
                        Resubscribe
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No opt-outs found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
