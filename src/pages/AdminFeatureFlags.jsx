import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminFeatureFlags() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const flagsQuery = useQuery({
    queryKey: ['feature-flags-admin', organizationId, schoolId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const query = `query FeatureFlagsAdmin($organizationId: uuid!, $schoolId: uuid) {
        feature_flags(
          where: {
            organization_id: { _eq: $organizationId },
            _or: [
              { school_id: { _eq: $schoolId } },
              { school_id: { _is_null: true } }
            ]
          },
          order_by: { key: asc }
        ) {
          id
          key
          enabled
          description
          school_id
        }
      }`;

      const res = await graphql(query, { organizationId, schoolId });
      return res?.feature_flags ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }) => {
      const mutation = `mutation ToggleFeatureFlag($id: uuid!, $enabled: Boolean!) {
        update_feature_flags_by_pk(pk_columns: { id: $id }, _set: { enabled: $enabled }) {
          id
          enabled
        }
      }`;
      await graphql(mutation, { id, enabled });
    },
    onSuccess: () => flagsQuery.refetch(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const mutation = `mutation InsertFeatureFlag($object: feature_flags_insert_input!) {
        insert_feature_flags_one(object: $object) { id }
      }`;
      await graphql(mutation, {
        object: {
          organization_id: organizationId,
          school_id: schoolId,
          key: newKey.trim(),
          description: newDescription.trim() || null,
          enabled: false,
        },
      });
    },
    onSuccess: () => {
      setNewKey('');
      setNewDescription('');
      flagsQuery.refetch();
    },
  });

  const groupedFlags = useMemo(() => flagsQuery.data ?? [], [flagsQuery.data]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">
          Toggle enterprise capabilities per tenant. School-specific flags override organization defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Flag</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr,3fr,auto]">
          <Input
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder="ENTERPRISE_SSO"
          />
          <Input
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Description"
          />
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newKey.trim() || createMutation.isLoading || !organizationId}
          >
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedFlags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No flags configured.
                  </TableCell>
                </TableRow>
              ) : (
                groupedFlags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-mono text-xs">{flag.key}</TableCell>
                    <TableCell>{flag.description ?? '—'}</TableCell>
                    <TableCell>{flag.school_id ? 'School' : 'Organization'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(flag.enabled)}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: flag.id, enabled: checked })}
                        aria-label={`Toggle ${flag.key}`}
                      />
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
