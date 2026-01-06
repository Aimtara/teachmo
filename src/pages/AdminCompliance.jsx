import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTenantScope } from '@/hooks/useTenantScope';
import { nhost } from '@/lib/nhostClient';

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export default function AdminCompliance() {
  const { data: scope } = useTenantScope();
  const { toast } = useToast();
  const [dsarUserId, setDsarUserId] = useState('');
  const [dsarReason, setDsarReason] = useState('');
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const headersQuery = useQuery({
    queryKey: ['compliance_token'],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });

  const retentionQuery = useQuery({
    queryKey: ['retention_policy', scope?.districtId, scope?.schoolId],
    enabled: Boolean(scope?.districtId),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/retention-policy`, { headers: headersQuery.data }),
  });

  const dsarListQuery = useQuery({
    queryKey: ['dsar_exports', scope?.districtId, scope?.schoolId],
    enabled: Boolean(scope?.districtId),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/dsar-exports`, { headers: headersQuery.data }),
  });

  const aiUsageQuery = useQuery({
    queryKey: ['ai-usage-compliance', scope?.districtId, scope?.schoolId],
    enabled: Boolean(scope?.districtId && headersQuery.data),
    queryFn: async () =>
      fetchJson(`${API_BASE_URL}/admin/ai/usage?limit=20`, { headers: headersQuery.data }),
  });

  const dsarMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/dsar-exports`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify({ userId: dsarUserId, reason: dsarReason }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Export ready',
        description: `DSAR export ${data?.id || ''} is ready to download.`,
      });
      setDsarUserId('');
      setDsarReason('');
      dsarListQuery.refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to create DSAR export.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/users/${deleteUserId}/hard-delete`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify({ reason: deleteReason }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'User deleted',
        description: 'The user record has been permanently removed.',
      });
      setDeleteUserId('');
      setDeleteReason('');
      setDeleteConfirm('');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Unable to delete user.',
      });
    },
  });

  const canDelete = useMemo(() => deleteConfirm.trim().toLowerCase() === 'delete', [deleteConfirm]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance Center</h1>
        <p className="text-sm text-muted-foreground">
          Handle DSAR requests, retention rules, and permanent deletion workflows for your tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention Policy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>
            <span className="text-muted-foreground">Audit logs:</span>{' '}
            {retentionQuery.data?.auditLogDays ? `${retentionQuery.data.auditLogDays} days` : 'Loading…'}
          </div>
          <div>
            <span className="text-muted-foreground">DSAR exports:</span>{' '}
            {retentionQuery.data?.dsarExportDays ? `${retentionQuery.data.dsarExportDays} days` : 'Loading…'}
          </div>
          <p className="text-xs text-muted-foreground">
            Update retention settings in Tenant Settings to change purge windows.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DSAR Exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">User ID</div>
              <Input value={dsarUserId} onChange={(e) => setDsarUserId(e.target.value)} placeholder="UUID" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Reason (optional)</div>
              <Input value={dsarReason} onChange={(e) => setDsarReason(e.target.value)} placeholder="DSAR request" />
            </div>
          </div>
          <Button onClick={() => dsarMutation.mutate()} disabled={!dsarUserId || dsarMutation.isPending}>
            {dsarMutation.isPending ? 'Requesting…' : 'Request export'}
          </Button>

          <div className="pt-2 border-t text-sm">
            <div className="font-medium mb-2">Recent exports</div>
            {dsarListQuery.isLoading ? (
              <div className="text-muted-foreground">Loading exports…</div>
            ) : !dsarListQuery.data?.length ? (
              <div className="text-muted-foreground">No exports requested yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Export ID</th>
                      <th className="p-2">Subject</th>
                      <th className="p-2">Created</th>
                      <th className="p-2">Expires</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dsarListQuery.data.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{row.id}</td>
                        <td className="p-2 font-mono text-xs">{row.subject_user_id}</td>
                        <td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                        <td className="p-2">{row.expires_at ? new Date(row.expires_at).toLocaleString() : '—'}</td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(`${API_BASE_URL}/admin/dsar-exports/${row.id}/download`, '_blank')}
                          >
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permanent Deletion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">User ID</div>
              <Input value={deleteUserId} onChange={(e) => setDeleteUserId(e.target.value)} placeholder="UUID" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Reason</div>
              <Input value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Policy violation" />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type DELETE to confirm</div>
            <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          </div>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={!deleteUserId || !canDelete || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Permanently delete user'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Usage Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Recent AI usage logs are retained for compliance and audit review.
          </p>
          {aiUsageQuery.isLoading ? (
            <div className="text-muted-foreground">Loading AI usage…</div>
          ) : aiUsageQuery.data?.usage?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Timestamp</th>
                    <th className="p-2">Model</th>
                    <th className="p-2">Tokens</th>
                    <th className="p-2">Cost</th>
                    <th className="p-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {aiUsageQuery.data.usage.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                      <td className="p-2">{row.model ?? '—'}</td>
                      <td className="p-2">{row.token_total ?? '—'}</td>
                      <td className="p-2">${Number(row.cost_usd || 0).toFixed(2)}</td>
                      <td className="p-2">{row.safety_risk_score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted-foreground">No AI usage logged yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Teachmo maintains audit logs for administrative actions, impersonation sessions, and data exports to
            support regulatory audits.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>DSAR exports include profile data, identities, and audit history for the subject.</li>
            <li>Retention policies are enforced nightly by the automated purge job.</li>
            <li>Permanent deletion bypasses soft delete and logs the before/after snapshot in audit logs.</li>
          </ul>
          <Textarea
            value={`Need documentation for GDPR, FERPA, or CCPA? Contact compliance@teachmo.com for our latest compliance packet.`}
            readOnly
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
