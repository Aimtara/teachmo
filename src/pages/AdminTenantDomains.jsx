import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminTenantDomains() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const [newDomain, setNewDomain] = useState('');

  const domainsQuery = useQuery({
    queryKey: ['tenant-domains', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = `query TenantDomains($organizationId: uuid!) {
        tenant_domains(where: { organization_id: { _eq: $organizationId } }, order_by: { domain: asc }) {
          id
          domain
          is_primary
          verified_at
        }
      }`;
      const data = await graphqlRequest({ query, variables: { organizationId } });
      return data?.tenant_domains ?? [];
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Missing organization scope');
      const mutation = `mutation AddTenantDomain($object: tenant_domains_insert_input!) {
        insert_tenant_domains_one(object: $object) { id }
      }`;
      await graphqlRequest({
        query: mutation,
        variables: {
          object: {
            organization_id: organizationId,
            domain: newDomain.trim().toLowerCase(),
            is_primary: false,
          },
        },
      });
    },
    onSuccess: () => {
      setNewDomain('');
      domainsQuery.refetch();
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async ({ id }) => {
      const mutation = `mutation SetPrimaryDomain($organizationId: uuid!, $id: uuid!) {
        update_tenant_domains(where: { organization_id: { _eq: $organizationId } }, _set: { is_primary: false }) {
          affected_rows
        }
        update_tenant_domains_by_pk(pk_columns: { id: $id }, _set: { is_primary: true }) { id }
      }`;
      await graphqlRequest({ query: mutation, variables: { organizationId, id } });
    },
    onSuccess: () => domainsQuery.refetch(),
  });

  const removeDomainMutation = useMutation({
    mutationFn: async ({ id }) => {
      const mutation = `mutation RemoveTenantDomain($id: uuid!) {
        delete_tenant_domains_by_pk(id: $id) { id }
      }`;
      await graphqlRequest({ query: mutation, variables: { id } });
    },
    onSuccess: () => domainsQuery.refetch(),
  });

  const domainRows = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data]);

  return (
    <ProtectedRoute allowedRoles={['system_admin', 'district_admin', 'school_admin', 'admin']}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Tenant Domains</h1>
          <p className="text-sm text-muted-foreground">Manage allowed email domains for single sign-on.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Add Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!newDomain.trim()) return;
                addDomainMutation.mutate();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                type="text"
                placeholder="example.com"
                value={newDomain}
                onChange={(event) => setNewDomain(event.target.value)}
              />
              <Button type="submit" variant="default" disabled={addDomainMutation.isLoading || !newDomain.trim()}>
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domainRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No domains configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  domainRows.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-mono text-xs">{domain.domain}</TableCell>
                      <TableCell>{domain.verified_at ? 'Verified' : 'Pending'}</TableCell>
                      <TableCell>{domain.is_primary ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPrimaryMutation.mutate({ id: domain.id })}
                          disabled={domain.is_primary}
                        >
                          Set primary
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDomainMutation.mutate({ id: domain.id })}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
