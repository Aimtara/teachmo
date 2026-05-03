import React, { useEffect, useState } from 'react';
import { Page, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminSISPermissions
 * Allows district admins to manage insert/update permissions for SIS and SCIM tables.
 */
export default function AdminSISPermissions() {
  const { hasPermission } = usePermissions();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPermissions = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query GetSISPermissions {
            sis_table_permissions {
              id
              table_name
              role
              can_insert
              can_update
            }
          }
        `,
        {}
      );
      setPermissions(res?.sis_table_permissions || []);
    } catch (err) {
      console.error('Failed to load permissions', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_sis_permissions')) {
      loadPermissions();
    }
  }, [hasPermission]);

  const togglePermission = async (id: string, field: 'can_insert' | 'can_update', value: boolean) => {
    setLoading(true);
    try {
      await nhost.graphql.request(
        `
          mutation UpdatePerm($id: uuid!, $changes: sis_table_permissions_set_input!) {
            update_sis_table_permissions_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
          }
        `,
        { id, changes: { [field]: value } }
      );
      loadPermissions();
    } catch (err) {
      console.error('Failed to update permission', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('manage_sis_permissions')) {
    return (
      <Page title="SIS Permissions">
        <p>You do not have permission to manage SIS/SCIM permissions.</p>
      </Page>
    );
  }

  return (
    <Page title="SIS Permissions">
      <p>Manage insert/update permissions for SIS/SCIM tables by role.</p>
      <Table
        data={permissions}
        columns={[
          { Header: 'Table', accessor: 'table_name' },
          { Header: 'Role', accessor: 'role' },
          {
            Header: 'Can Insert',
            accessor: 'can_insert',
            Cell: ({ row }: any) => (
              <input
                type="checkbox"
                checked={row.original.can_insert}
                onChange={(e: any) => togglePermission(row.original.id, 'can_insert', e.target.checked)}
              />
            ),
          },
          {
            Header: 'Can Update',
            accessor: 'can_update',
            Cell: ({ row }: any) => (
              <input
                type="checkbox"
                checked={row.original.can_update}
                onChange={(e: any) => togglePermission(row.original.id, 'can_update', e.target.checked)}
              />
            ),
          },
        ]}
      />
    </Page>
  );
}
