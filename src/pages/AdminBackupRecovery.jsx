import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Button, LoadingSpinner, Select } from '@/components/ui';
import { toast } from 'react-toastify';

/**
 * AdminBackupRecovery provides a simple interface for administrators to
 * initiate backups and restore from previous backups. This ensures that
 * organisations can recover from data loss or migrations. It also lists
 * historical backups for transparency.
 */
export default function AdminBackupRecovery() {
  const [env, setEnv] = useState('prod');

  // Load existing backups
  const { data: backups = [], isLoading, refetch } = useQuery(
    ['backups'],
    async () => {
      const res = await graphqlRequest({
        query: `query BackupJobs {
          backup_jobs(order_by: {created_at: desc}) {
            id
            environment
            status
            created_at
          }
        }`,
      });
      return res?.backup_jobs ?? [];
    },
  );

  const runBackup = useMutation(
    async () => {
      await graphqlRequest({
        query: `mutation RunBackup($env: String!) {
          admin_run_backup(environment: $env)
        }`,
        variables: { env },
      });
    },
    {
      onSuccess: () => {
        toast.success('Backup started');
        refetch();
      },
      onError: () => toast.error('Failed to start backup'),
    },
  );

  const restoreBackup = useMutation(
    async (id) => {
      await graphqlRequest({
        query: `mutation RestoreBackup($id: uuid!) {
          admin_restore_backup(id: $id)
        }`,
        variables: { id },
      });
    },
    {
      onSuccess: () => {
        toast.success('Restore initiated');
        refetch();
      },
      onError: () => toast.error('Failed to restore backup'),
    },
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Backup &amp; Recovery</h1>
      <p className="text-gray-600 max-w-2xl">
        Create and restore backups of your organisation’s data. Regular backups
        help mitigate data loss and enable smooth migrations. Select an
        environment (production or staging) before running a backup.
      </p>
      <Card className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <label htmlFor="env">Environment</label>
            <Select id="env" value={env} onChange={(e) => setEnv(e.target.value)}>
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
              <option value="dev">Development</option>
            </Select>
          </div>
          <Button variant="primary" onClick={() => runBackup.mutate()}>
            Run Backup
          </Button>
        </div>
        <h2 className="text-lg font-semibold mt-6">Backup History</h2>
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Environment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No backups found
                </td>
              </tr>
            )}
            {backups.map((backup) => (
              <tr key={backup.id}>
                <td>{new Date(backup.created_at).toLocaleDateString()}</td>
                <td>{backup.environment}</td>
                <td className="capitalize">{backup.status}</td>
                <td>
                  {backup.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => restoreBackup.mutate(backup.id)}
                    >
                      Restore
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

