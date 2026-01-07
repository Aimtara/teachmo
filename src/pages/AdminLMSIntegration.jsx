import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Select, Button, LoadingSpinner } from '@/components/ui';
import { toast } from 'react-toastify';

// Mapping of provider keys to human-friendly names
const PROVIDER_LABELS = {
  canvas: 'Canvas',
  schoology: 'Schoology',
  blackboard: 'Blackboard',
  google_classroom: 'Google Classroom',
};

/**
 * AdminLMSIntegration allows district administrators to manage connections to
 * various learning management systems (LMS/LTI providers) and schedule roster
 * synchronisations. Administrators can see the current status of each
 * provider, change the sync schedule (manual, hourly, daily or weekly) and
 * trigger a manual sync on demand.
 */
export default function AdminLMSIntegration() {
  // Fetch the list of configured LMS providers for this tenant
  const { data: providers = [], isLoading, refetch } = useQuery(
    ['lmsProviders'],
    async () => {
      const res = await graphqlRequest({
        query: `
          query LMSProviders {
            lms_providers(order_by: {provider: asc}) {
              id
              provider
              status
              schedule
              last_sync_at
            }
          }
        `,
      });
      return res?.lms_providers ?? [];
    },
  );

  // Mutation to update the sync schedule for a provider
  const updateSchedule = useMutation(
    async ({ id, schedule }) => {
      await graphqlRequest({
        query: `
          mutation UpdateLMSProviderSchedule($id: uuid!, $schedule: String) {
            update_lms_providers_by_pk(
              pk_columns: { id: $id },
              _set: { schedule: $schedule }
            ) {
              id
            }
          }
        `,
        variables: { id, schedule },
      });
    },
    {
      onSuccess: () => {
        toast.success('Updated schedule');
        refetch();
      },
      onError: () => toast.error('Failed to update schedule'),
    },
  );

  // Mutation to trigger a manual sync for a provider
  const runSync = useMutation(
    async (id) => {
      await graphqlRequest({
        query: `
          mutation RunLMSSync($id: uuid!) {
            run_lms_sync(id: $id)
          }
        `,
        variables: { id },
      });
    },
    {
      onSuccess: () => toast.success('Sync started'),
      onError: () => toast.error('Failed to start sync'),
    },
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">LMS Integrations</h1>
      <p className="text-gray-600 max-w-2xl">
        Connect to learning management systems (Canvas, Schoology, Blackboard, Google
        Classroom) and schedule automatic roster synchronisations. Changes here apply
        only to your current organisation.
      </p>
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Status</th>
              <th>Sync Schedule</th>
              <th>Last Sync</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((prov) => (
              <tr key={prov.id}>
                <td>{PROVIDER_LABELS[prov.provider] ?? prov.provider}</td>
                <td className="capitalize">{prov.status || 'disconnected'}</td>
                <td>
                  <Select
                    value={prov.schedule ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : e.target.value;
                      updateSchedule.mutate({ id: prov.id, schedule: value });
                    }}
                  >
                    <option value="">Manual</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </Select>
                </td>
                <td>
                  {prov.last_sync_at
                    ? new Date(prov.last_sync_at).toLocaleString()
                    : 'Never'}
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => runSync.mutate(prov.id)}
                    disabled={prov.status !== 'connected'}
                  >
                    Run Sync
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
