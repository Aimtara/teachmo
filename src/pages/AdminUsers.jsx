import { useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { nhost } from '@/lib/nhostClient';
import { useTenant } from '@/contexts/TenantContext';

const USER_QUERY = `query TenantUsers($districtId: uuid!) {
  auth_users(where: { profile: { district_id: { _eq: $districtId } } }, order_by: { created_at: desc }) {
    id
    email
    display_name
    created_at
    last_seen
    profile {
      user_id
      role
      district_id
      school_id
    }
  }
}`;

const UPDATE_ROLE = `mutation UpdateRole($userId: uuid!, $role: String!) {
  update_user_profiles_by_pk(pk_columns: { user_id: $userId }, _set: { role: $role }) {
    user_id
    role
  }
}`;

const ROLE_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'school_admin', label: 'School admin' },
  { value: 'district_admin', label: 'District admin' },
  { value: 'partner', label: 'Partner' },
  { value: 'system_admin', label: 'System admin' }
];

export default function AdminUsers() {
  const { isAuthenticated } = useAuthenticationStatus();
  const tenant = useTenant();
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('');

  const filteredUsers = useMemo(() => {
    if (!tenant.schoolId) return users;
    return users.filter((user) => user.profile?.school_id === tenant.schoolId);
  }, [users, tenant.schoolId]);

  const loadUsers = async () => {
    if (!tenant.organizationId) return;
    const { data, error } = await nhost.graphql.request(USER_QUERY, {
      districtId: tenant.organizationId
    });
    if (error) {
      setStatus(`Failed to load users: ${error.message}`);
      setUsers([]);
      return;
    }
    setUsers(data?.auth_users || []);
    setStatus('');
  };

  useEffect(() => {
    if (tenant.loading || !tenant.organizationId) return;
    loadUsers();
  }, [tenant.loading, tenant.organizationId, tenant.schoolId]);

  const updateRole = async (userId, role) => {
    setStatus('Updating role…');
    const { error } = await nhost.graphql.request(UPDATE_ROLE, { userId, role });
    if (error) {
      setStatus(`Update failed: ${error.message}`);
      return;
    }
    setStatus('Role updated.');
    loadUsers();
  };

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (tenant.loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading tenant…</div>;
  if (!tenant.organizationId) return <div className="p-6 text-center text-sm text-destructive">Missing tenant scope.</div>;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Tenant users</h1>
        <p className="text-gray-600">Manage roles for users in your district or school.</p>
      </header>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-3 py-2">{user.display_name || '—'}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border px-2 py-1"
                    value={user.profile?.role || 'parent'}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{user.last_seen ? new Date(user.last_seen).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {!filteredUsers.length && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No users found for this tenant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
