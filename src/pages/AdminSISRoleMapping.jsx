import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Select, LoadingSpinner } from '@/components/ui';
import { toast } from 'sonner';

// List of application roles available for mapping. In a real implementation
// this might be fetched from the API.
const APP_ROLES = ['admin', 'teacher', 'student', 'parent'];

/**
 * AdminSISRoleMapping maps SIS roles (e.g. from OneRoster/Clever) to internal
 * application roles. When roster data is imported, the assigned SIS role will
 * determine the user's app role based on these mappings.
 */
export default function AdminSISRoleMapping() {
  // Fetch existing mappings
  const {
    data: mappings = [],
    isLoading,
    refetch,
  } = useQuery(
    ['sisRoleMappings'],
    async () => {
      const res = await graphqlRequest({
        query: `query SISRoleMappings {
          sis_role_mappings(order_by: {sis_role: asc}) {
            id
            sis_role
            app_role
          }
        }`,
      });
      return res?.sis_role_mappings ?? [];
    },
  );

  // Mutation to update a role mapping
  const updateMapping = useMutation(
    async ({ id, app_role }) => {
      await graphqlRequest({
        query: `mutation UpdateSISRoleMapping($id: uuid!, $app_role: String!) {
          update_sis_role_mappings_by_pk(pk_columns: { id: $id }, _set: { app_role: $app_role }) {
            id
          }
        }`,
        variables: { id, app_role },
      });
    },
    {
      onSuccess: () => {
        toast.success('Mapping updated');
        refetch();
      },
      onError: () => toast.error('Failed to update mapping'),
    },
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">SIS Role Mapping</h1>
      <p className="text-gray-600 max-w-2xl">
        Map the roles provided by your Student Information System (SIS) to the
        internal roles used by Teachmo. These mappings determine what permissions
        users receive when roster data is synchronised.
      </p>
      <Card>
        <Table>
          <thead>
            <tr>
              <th>SIS Role</th>
              <th>App Role</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.id}>
                <td>{mapping.sis_role}</td>
                <td>
                  <Select
                    value={mapping.app_role ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateMapping.mutate({ id: mapping.id, app_role: value });
                    }}
                  >
                    {APP_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
