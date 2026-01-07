import React, { useEffect, useState } from 'react';
import { Page, Card, Button, Table, Modal } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminDSARManager
 * Displays DSAR export requests and allows administrators to create export requests or permanently delete user data.
 * This page interacts with compliance serverless functions to manage exports and deletions.
 */
export default function AdminDSARManager() {
  const { hasPermission } = usePermissions();
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalUserId, setModalUserId] = useState<string | null>(null);

  const fetchExports = async () => {
    setLoading(true);
    try {
      const res = await nhost.functions.call('admin-compliance-list-exports', {});
      setExports(res?.exports || []);
    } catch (err) {
      console.error('Failed to load DSAR exports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_dsar_requests')) {
      fetchExports();
    }
  }, [hasPermission]);

  const requestExport = async () => {
    const userId = prompt('Enter the user ID to export');
    if (!userId) return;
    setLoading(true);
    try {
      await nhost.functions.call('admin-compliance-create-export', { userId });
      fetchExports();
    } catch (err) {
      console.error('Failed to create DSAR export', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    const userId = modalUserId;
    setModalUserId(null);
    if (!userId) return;
    setLoading(true);
    try {
      await nhost.functions.call('admin-compliance-delete-user', { userId });
      fetchExports();
    } catch (err) {
      console.error('Failed to delete user data', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('manage_dsar_requests')) {
    return (
      <Page title="DSAR Manager">
        <p>You do not have permission to manage DSAR requests.</p>
      </Page>
    );
  }

  return (
    <Page title="DSAR Manager">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Data Subject Access Requests</h2>
        <Button onClick={requestExport}>Create Export</Button>
      </div>
      {loading && <p>Loading...</p>}
      <Table
        columns={[
          { Header: 'User ID', accessor: 'userId' },
          { Header: 'Requested At', accessor: 'createdAt' },
          { Header: 'Status', accessor: 'status' },
          {
            Header: 'Actions',
            accessor: 'actions',
            Cell: ({ row }: any) => (
              <div className="space-x-2">
                <Button
                  onClick={() => nhost.functions.call('admin-compliance-download-export', { id: row.original.id })}
                >
                  Download
                </Button>
                <Button variant="danger" onClick={() => setModalUserId(row.original.userId)}>
                  Delete User
                </Button>
              </div>
            ),
          },
        ]}
        data={exports}
      />
      {modalUserId && (
        <Modal
          title="Confirm Permanent Deletion"
          onClose={() => setModalUserId(null)}
          onConfirm={confirmDelete}
          confirmLabel="Delete"
        >
          <p>
            Are you sure you want to permanently delete all data for user ID{' '}
            <strong>{modalUserId}</strong>? This action cannot be undone.
          </p>
        </Modal>
      )}
    </Page>
  );
}
