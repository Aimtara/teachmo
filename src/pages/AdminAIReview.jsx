import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUserId } from '@nhost/react';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminAIReview() {
  const userId = useUserId();
  const { data: scope } = useTenantScope();
  const districtId = scope?.districtId ?? null;
  const schoolId = scope?.schoolId ?? null;

  const queueQuery = useQuery({
    queryKey: ['ai-review-queue', districtId, schoolId],
    enabled: Boolean(districtId),
    queryFn: async () => {
      const query = `query ReviewQueue($where: ai_review_queue_bool_exp!) {
        ai_review_queue(where: $where, order_by: { created_at: desc }, limit: 50) {
          id
          usage_log_id
          status
          reason
          created_at
          reviewer_id
          reviewed_at
        }
      }`;

      const where = schoolId
        ? { school_id: { _eq: schoolId } }
        : { district_id: { _eq: districtId } };

      const res = await graphql(query, { where });
      return res?.ai_review_queue ?? [];
    },
  });

  const usageLogsQuery = useQuery({
    queryKey: ['ai-usage-logs', queueQuery.data],
    enabled: (queueQuery.data ?? []).length > 0,
    queryFn: async () => {
      const ids = queueQuery.data.map((item) => item.usage_log_id);
      const query = `query UsageLogs($ids: [uuid!]!) {
        ai_usage_logs(where: { id: { _in: $ids } }) {
          id
          model
          created_at
          prompt_hash
          response_hash
          metadata
        }
      }`;
      const res = await graphql(query, { ids });
      return res?.ai_usage_logs ?? [];
    },
  });

  const usageLookup = useMemo(() => {
    const map = new Map();
    (usageLogsQuery.data ?? []).forEach((log) => map.set(log.id, log));
    return map;
  }, [usageLogsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const mutation = `mutation UpdateReview($id: uuid!, $status: String!, $reviewer: uuid, $reviewedAt: timestamptz!) {
        update_ai_review_queue_by_pk(
          pk_columns: { id: $id },
          _set: { status: $status, reviewer_id: $reviewer, reviewed_at: $reviewedAt }
        ) { id status }
      }`;
      await graphql(mutation, {
        id,
        status,
        reviewer: userId || null,
        reviewedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => queueQuery.refetch(),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject AI-generated content that requires human moderation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(queueQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No items awaiting review.
                  </TableCell>
                </TableRow>
              ) : (
                (queueQuery.data ?? []).map((item) => {
                  const usage = usageLookup.get(item.usage_log_id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>{usage?.model ?? '—'}</TableCell>
                      <TableCell className="capitalize">{item.status}</TableCell>
                      <TableCell>{item.reason ?? usage?.metadata?.reason ?? '—'}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: item.id, status: 'approved' })}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: item.id, status: 'rejected' })}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
