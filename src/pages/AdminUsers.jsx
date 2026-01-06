import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { nhost } from '@/lib/nhostClient';
import { useUserRole } from '@/hooks/useUserRole';
import { canAll } from '@/security/permissions';

const ROLES = ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'];

const QUERY = `
query ListUserProfiles($where: user_profiles_bool_exp, $limit: Int!, $offset: Int!) {
  user_profiles(where: $where, limit: $limit, offset: $offset, order_by: { created_at: desc }) {
    user_id
    role
    district_id
    school_id
    full_name
    created_at
  }
  user_profiles_aggregate(where: $where) { aggregate { count } }
}
`;

const UPDATE = `
mutation UpdateUserProfile($userId: uuid!, $changes: user_profiles_set_input!) {
  update_user_profiles_by_pk(pk_columns: { user_id: $userId }, _set: $changes) {
    user_id
    role
    district_id
    school_id
    full_name
  }
}
`;

export default function AdminUsers() {
  const { data: scope } = useTenantScope();
  const isSystem = scope?.role === 'system_admin' || scope?.role === 'admin';
  const role = useUserRole();
  const { toast } = useToast();
  const canManageUsers = canAll(role, ['users:manage']);
  const canImpersonate = canManageUsers;

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const limit = 25;

  const where = useMemo(() => {
    const clauses = [];

    if (q?.trim()) {
      clauses.push({ full_name: { _ilike: `%${q.trim()}%` } });
    }

    if (roleFilter !== 'all') {
      clauses.push({ role: { _eq: roleFilter } });
    }

    if (!isSystem) {
      if (scope?.schoolId) clauses.push({ school_id: { _eq: scope.schoolId } });
      else if (scope?.districtId) clauses.push({ district_id: { _eq: scope.districtId } });
    }

    return clauses.length ? { _and: clauses } : {};
  }, [q, roleFilter, isSystem, scope?.districtId, scope?.schoolId]);

  const usersQuery = useQuery({
    queryKey: ['admin_users', where, page],
    enabled: Boolean(scope?.userId),
    queryFn: async () => {
      const res = await graphql(QUERY, { where, limit, offset: page * limit });
      if (res.error) throw res.error;
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, changes }) => {
      const res = await graphql(UPDATE, { userId, changes });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => usersQuery.refetch(),
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId) => {
      const token = await nhost.auth.getAccessToken();
      const response = await fetch('/api/admin/impersonations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to start impersonation');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Impersonation ready',
        description: `Token created (expires ${data?.expiresAt || 'soon'}).`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Impersonation failed',
        description: error instanceof Error ? error.message : 'Unable to start impersonation.',
      });
    },
  });

  const total = usersQuery.data?.user_profiles_aggregate?.aggregate?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Tenant-scoped user profile administration (backed by Hasura GraphQL, enforced by DB RLS).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by full name" />
          </div>
          <div className="w-full md:w-56">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User profiles</CardTitle>
          <div className="text-xs text-muted-foreground">{total} total</div>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading users…</div>
          ) : !usersQuery.data?.user_profiles?.length ? (
            <div className="text-sm text-muted-foreground">No users match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">User ID</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">District</th>
                    <th className="p-2">School</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data.user_profiles.map((u) => (
                    <UserRow
                      key={u.user_id}
                      user={u}
                      isSystem={isSystem}
                      onSave={(changes) => updateMutation.mutate({ userId: u.user_id, changes })}
                      onImpersonate={() => impersonateMutation.mutate(u.user_id)}
                      saving={updateMutation.isPending}
                      canManageUsers={canManageUsers}
                      canImpersonate={canImpersonate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ user, isSystem, onSave, onImpersonate, saving, canManageUsers, canImpersonate }) {
  const [role, setRole] = useState(user.role ?? 'parent');
  const [districtId, setDistrictId] = useState(user.district_id ?? '');
  const [schoolId, setSchoolId] = useState(user.school_id ?? '');
  const [fullName, setFullName] = useState(user.full_name ?? '');

  const dirty = role !== (user.role ?? 'parent') || districtId !== (user.district_id ?? '') || schoolId !== (user.school_id ?? '') || fullName !== (user.full_name ?? '');

  return (
    <tr className="border-b align-top">
      <td className="p-2">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!canManageUsers} />
      </td>
      <td className="p-2 font-mono text-xs whitespace-nowrap">{user.user_id}</td>
      <td className="p-2">
        <Select value={role} onValueChange={setRole} disabled={!canManageUsers}>
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Input value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!canManageUsers || (!isSystem && Boolean(user.district_id))} placeholder="District UUID" />
      </td>
      <td className="p-2">
        <Input value={schoolId} onChange={(e) => setSchoolId(e.target.value)} disabled={!canManageUsers || (!isSystem && Boolean(user.school_id))} placeholder="School UUID" />
      </td>
      <td className="p-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!dirty || saving || !canManageUsers}
            onClick={() =>
              onSave({
                role,
                district_id: districtId || null,
                school_id: schoolId || null,
                full_name: fullName || null,
              })
            }
          >
            Save
          </Button>
          {canImpersonate ? (
            <Button size="sm" variant="secondary" onClick={onImpersonate}>
              Impersonate
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
