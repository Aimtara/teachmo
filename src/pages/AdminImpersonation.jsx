import React, { useEffect, useState } from 'react';
import { Page, Card, Button, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminImpersonation
 * Shows active impersonation sessions and allows administrators to end sessions or start impersonating a user.
 */
export default function AdminImpersonation() {
  const { hasPermission } = usePermissions();
  const [sessions, setSessions] = useState<any[]>([]);

  const loadSessions = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query ListSessions {
            impersonation_sessions {
              id
              user_id
              impersonator_id
              created_at
              expires_at
            }
          }
        `,
        {}
      );
      setSessions(res?.impersonation_sessions || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_impersonation')) {
      loadSessions();
    }
  }, [hasPermission]);

  const endSession = async (id: string) => {
    try {
      await nhost.graphql.request(
        `
          mutation EndSession($id: uuid!) {
            delete_impersonation_sessions_by_pk(id: $id) { id }
          }
        `,
        { id }
      );
      loadSessions();
    } catch (err) {
      console.error('Failed to end session', err);
    }
  };

  const startImpersonation = async () => {
    const userId = prompt('Enter the user ID to impersonate:');
    if (!userId) return;
    try {
      await nhost.graphql.request(
        `
          mutation StartImpersonation($userId: uuid!) {
            start_impersonation(user_id: $userId) {
              token
            }
          }
        `,
        { userId }
      );
      alert('Impersonation session started. Refresh the page to switch contexts.');
      loadSessions();
    } catch (err) {
      console.error('Failed to start impersonation', err);
    }
  };

  if (!hasPermission('manage_impersonation')) {
    return (
      <Page title="Impersonation Sessions">
        <p>You do not have permission to manage impersonation sessions.</p>
      </Page>
    );
  }

  return (
    <Page title="Impersonation Sessions">
      <p>View and manage active impersonation sessions.</p>
      <Button onClick={startImpersonation}>Start Impersonation</Button>
      <Table
        data={sessions}
        columns={[
          { Header: 'Session ID', accessor: 'id' },
          { Header: 'User ID', accessor: 'user_id' },
          { Header: 'Impersonator', accessor: 'impersonator_id' },
          { Header: 'Created At', accessor: 'created_at' },
          { Header: 'Expires At', accessor: 'expires_at' },
          {
            Header: 'Actions',
            accessor: 'actions',
            Cell: ({ row }: any) => (
              <Button variant="danger" onClick={() => endSession(row.original.id)}>
                End Session
              </Button>
            ),
          },
        ]}
      />
    </Page>
  );
}
