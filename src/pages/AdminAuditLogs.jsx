import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nhost } from '@/lib/nhostClient';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminAuditLogs() {
  const { data: scope } = useTenantScope();
  const districtId = scope?.districtId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const [search, setSearch] = useState('');

  const auditQuery = useQuery({
    queryKey: ['audit-log', districtId, schoolId],
    enabled: Boolean(districtId),
    queryFn: async () => {
      const query = `query AuditLog($where: audit_log_bool_exp!, $limit: Int!) {
        audit_log(where: $where, order_by: { created_at: desc }, limit: $limit) {
          id
          created_at
          actor_id
          action
          entity_type
          entity_id
          metadata
          district_id
          school_id
        }
      }`;

      const where = schoolId
        ? { school_id: { _eq: schoolId } }
        : { district_id: { _eq: districtId } };

      const res = await graphql(query, { where, limit: 200 });
      return res?.audit_log ?? [];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return auditQuery.data ?? [];
    return (auditQuery.data ?? []).filter((row) => {
      return (
        row.action?.toLowerCase().includes(term) ||
        row.entity_type?.toLowerCase().includes(term)
      );
    });
  }, [auditQuery.data, search]);

  const exportCsv = async () => {
    const { res, error } = await nhost.functions.call('audit-export', {
      search,
      districtId,
      schoolId,
    });

    if (error) {
      console.error(error);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          View immutable audit records for security-sensitive activity. Filters apply to your tenant scope.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by action or entity"
            className="md:max-w-sm"
          />
          <Button onClick={exportCsv} disabled={!districtId}>
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy p') : '—'}
                    </TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.actor_id ?? 'system'}
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
