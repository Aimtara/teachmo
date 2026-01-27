import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export default function AdminAIReview() {
  const headersQuery = useQuery({
    queryKey: ['ai-review-token'],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });

  const queueQuery = useQuery({
    queryKey: ['ai-review-queue'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/review-queue`, { headers: headersQuery.data }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, reason, notes }) => {
      return fetchJson(`${API_BASE_URL}/admin/ai/review-queue/${id}/decision`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify({ status, reason, notes }),
      });
    },
    onSuccess: () => queueQuery.refetch(),
  });

  const [decisionData, setDecisionData] = useState({});
  const queue = queueQuery.data?.queue || [];

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
                  <TableHead>Risk</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Decision details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No items awaiting review.
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>{item.model ?? '—'}</TableCell>
                    <TableCell>{item.safety_risk_score ?? '—'}</TableCell>
                    <TableCell>{item.reason ?? '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-[220px]">
                        <label className="block text-xs font-medium text-muted-foreground" htmlFor={`reason-${item.id}`}>
                          Decision reason
                        </label>
                        <select
                          id={`reason-${item.id}`}
                          value={decisionData[item.id]?.reason ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDecisionData((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || {}), reason: value },
                            }));
                          }}
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          <option value="">Select reason</option>
                          <option value="accurate">Accurate</option>
                          <option value="inaccurate">Inaccurate</option>
                          <option value="bias">Bias</option>
                          <option value="sensitive">Sensitive content</option>
                          <option value="other">Other</option>
                        </select>
                        <Textarea
                          value={decisionData[item.id]?.notes ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDecisionData((prev) => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || {}), notes: value },
                            }));
                          }}
                          placeholder="Add notes for this decision"
                          className="min-h-[80px]"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateMutation.mutate({
                            id: item.id,
                            status: 'approved',
                            reason: decisionData[item.id]?.reason ?? '',
                            notes: decisionData[item.id]?.notes ?? '',
                          })
                        }
                        disabled={updateMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          updateMutation.mutate({
                            id: item.id,
                            status: 'rejected',
                            reason: decisionData[item.id]?.reason ?? '',
                            notes: decisionData[item.id]?.notes ?? '',
                          })
                        }
                        disabled={updateMutation.isPending}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
