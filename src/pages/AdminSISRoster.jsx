import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nhost } from '@/lib/nhostClient';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminSISRoster() {
  const { data: scope } = useTenantScope();
  const districtId = scope?.districtId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const [file, setFile] = useState(null);
  const [rosterType, setRosterType] = useState('users');
  const [source, setSource] = useState('csv');

  const rosterQuery = useQuery({
    queryKey: ['sis-rosters', districtId, schoolId],
    enabled: Boolean(districtId),
    queryFn: async () => {
      const query = `query SisRosters($where: sis_rosters_bool_exp!) {
        sis_rosters(where: $where, order_by: { created_at: desc }, limit: 50) {
          id
          roster_type
          source
          external_id
          status
          created_at
        }
      }`;

      const where = schoolId
        ? { school_id: { _eq: schoolId } }
        : { district_id: { _eq: districtId } };

      const res = await graphql(query, { where });
      return res?.sis_rosters ?? [];
    },
  });

  const handleUpload = async () => {
    if (!file) return;
    const text = await file.text();
    const { error } = await nhost.functions.call('sis-roster-import', {
      csvText: text,
      rosterType,
      source,
      schoolId,
    });
    if (error) {
      console.error(error);
      return;
    }
    setFile(null);
    rosterQuery.refetch();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SIS Roster Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload OneRoster-formatted CSV data to synchronize read-only roster records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr,1fr,1fr,auto]">
          <Input
            value={rosterType}
            onChange={(event) => setRosterType(event.target.value)}
            placeholder="users | classes | enrollments"
          />
          <Input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="csv | clever | classlink"
          />
          <Input
            type="file"
            accept=".csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button onClick={handleUpload} disabled={!file || !districtId}>
            Upload
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Imported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rosterQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No roster records found.
                  </TableCell>
                </TableRow>
              ) : (
                (rosterQuery.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.roster_type}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</TableCell>
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
