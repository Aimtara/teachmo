import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nhost } from '@/lib/nhostClient';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { CsvRosterService } from '@/services/integrations/csvRosterService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminSISRoster() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const [file, setFile] = useState(null);
  const [rosterType, setRosterType] = useState('users');
  const [source, setSource] = useState('csv');
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationSummary, setValidationSummary] = useState('');

  const rosterQuery = useQuery({
    queryKey: ['sis-import-jobs', organizationId, schoolId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = `query SisImportJobs($where: sis_import_jobs_bool_exp!) {
        sis_import_jobs(where: $where, order_by: { created_at: desc }, limit: 50) {
          id
          roster_type
          source
          status
          created_at
        }
      }`;

      const where = schoolId
        ? { school_id: { _eq: schoolId } }
        : { organization_id: { _eq: organizationId } };

      const res = await graphql(query, { where });
      return res?.sis_import_jobs ?? [];
    },
  });

  const handleUpload = async () => {
    if (!file || !organizationId) return;
    const csvText = await file.text();
    setValidationErrors([]);
    setValidationSummary('');
    try {
      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvText);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      if (validRows.length === 0) {
        setValidationErrors(['No valid roster rows found in the CSV file.']);
        return;
      }
      setValidationSummary(`Validated ${validRows.length} roster rows. Ready to upload.`);
    } catch (error) {
      setValidationErrors([error?.message ?? 'Unable to validate CSV file.']);
      return;
    }
    const { error } = await nhost.functions.call('sis-roster-import', {
      csvText,
      rosterType,
      source,
      schoolId,
      fileName: file.name,
      fileSize: file.size,
    });
    if (error) {
      console.error(error);
      return;
    }
    setFile(null);
    setValidationSummary('');
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
          <Button onClick={handleUpload} disabled={!file || !organizationId}>
            Upload
          </Button>
        </CardContent>
        {(validationSummary || validationErrors.length > 0) && (
          <CardContent className="pt-0">
            {validationSummary && (
              <p className="text-sm text-emerald-600">{validationSummary}</p>
            )}
            {validationErrors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">CSV validation issues:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {validationErrors.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
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
