import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    mutationFn: async ({ id, status }) => {
      return fetchJson(`${API_BASE_URL}/admin/ai/review-queue/${id}/decision`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queueQuery.refetch(),
  });

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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
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
                    <TableCell className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: item.id, status: 'approved' })}
                        disabled={updateMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: item.id, status: 'rejected' })}
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
