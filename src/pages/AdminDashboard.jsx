import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bootstrapOrganization } from '@/domains/onboarding';
import { createProfile, fetchUserProfile } from '@/domains/auth';
import { graphqlRequest } from '@/lib/graphql';
import { useTelemetry } from '@/utils/useTelemetry';
import { logAuditEvent } from '@/api/functions';

export default function AdminDashboard() {
  const [orgForm, setOrgForm] = useState({ organizationName: '', schoolName: '' });
  const [userForm, setUserForm] = useState({ userId: '', fullName: '', role: 'teacher', organizationId: '', schoolId: '' });
  const [message, setMessage] = useState('');
  const { log } = useTelemetry();
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const query = `query AdminDashboardMetrics {
        organizations_aggregate {
          aggregate {
            count
          }
        }
        schools_aggregate {
          aggregate {
            count
          }
        }
        profiles_aggregate {
          aggregate {
            count
          }
        }
        classrooms_aggregate {
          aggregate {
            count
          }
        }
      }`;

      return graphqlRequest({ query });
    },
    staleTime: 1000 * 60 * 5
  });

  const handleOrgSubmit = async (evt) => {
    evt.preventDefault();
    const data = await bootstrapOrganization({
      organizationName: orgForm.organizationName,
      schoolName: orgForm.schoolName
    });
    log('organization_bootstrap', {
      organizationName: orgForm.organizationName,
      schoolName: orgForm.schoolName,
      organizationId: data.organization?.id
    });
    setMessage(`Created/updated organization ${data.organization?.name}`);
  };

  const handleUserSubmit = async (evt) => {
    evt.preventDefault();
    const before = await fetchUserProfile(userForm.userId);
    const after = await createProfile({
      user_id: userForm.userId,
      full_name: userForm.fullName,
      app_role: userForm.role,
      organization_id: userForm.organizationId || null,
      school_id: userForm.schoolId || null
    });
    await logAuditEvent({
      action: before ? 'user.role_change' : 'user.create_profile',
      entity_type: 'user',
      entity_id: userForm.userId,
      before,
      after,
      metadata: {
        organization_id: userForm.organizationId || null,
        school_id: userForm.schoolId || null,
      },
    });
    log('admin_assign_role', {
      userId: userForm.userId,
      role: userForm.role,
      organizationId: userForm.organizationId || null,
      schoolId: userForm.schoolId || null
    });
    setMessage('User role saved');
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <p className="text-gray-600">Manage organizations, schools, and roles.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Organizations"
          value={metricsLoading ? '—' : metrics?.organizations_aggregate?.aggregate?.count}
        />
        <Stat
          label="Schools"
          value={metricsLoading ? '—' : metrics?.schools_aggregate?.aggregate?.count}
        />
        <Stat
          label="Profiles"
          value={metricsLoading ? '—' : metrics?.profiles_aggregate?.aggregate?.count}
        />
        <Stat
          label="Classrooms"
          value={metricsLoading ? '—' : metrics?.classrooms_aggregate?.aggregate?.count}
        />
      </section>

      <form onSubmit={handleOrgSubmit} className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-medium">Create organization & school</h2>
        <input
          placeholder="Organization name"
          value={orgForm.organizationName}
          onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          placeholder="School name"
          value={orgForm.schoolName}
          onChange={(e) => setOrgForm({ ...orgForm, schoolName: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
      </form>

      <form onSubmit={handleUserSubmit} className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-medium">Assign user role</h2>
        <input
          placeholder="User ID"
          value={userForm.userId}
          onChange={(e) => setUserForm({ ...userForm, userId: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          placeholder="Full name"
          value={userForm.fullName}
          onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <select
          value={userForm.role}
          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="parent">Parent</option>
          <option value="teacher">Teacher</option>
          <option value="partner">Partner</option>
          <option value="system_admin">System admin</option>
          <option value="school_admin">School admin</option>
          <option value="district_admin">District admin</option>
        </select>
        <input
          placeholder="Organization ID"
          value={userForm.organizationId}
          onChange={(e) => setUserForm({ ...userForm, organizationId: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
        <input
          placeholder="School ID"
          value={userForm.schoolId}
          onChange={(e) => setUserForm({ ...userForm, schoolId: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save role</button>
      </form>

      {message && <p className="text-green-700 text-sm">{message}</p>}

      <section className="bg-white rounded shadow p-4 space-y-2">
        <h2 className="font-medium">Pilot tools</h2>
        <p className="text-gray-600 text-sm">
          Generate and review weekly parent briefs on demand.
        </p>
        <Link
          to="/admin/weekly-briefs"
          className="inline-flex items-center text-sm text-blue-700 hover:underline"
        >
          Open Weekly Briefs tool
        </Link>
      </section>

      <section className="bg-white rounded shadow p-4 space-y-2">
        <h2 className="font-medium">Audit logs</h2>
        <p className="text-sm text-gray-600">
          Audit log reporting is migrating to Nhost. Enable the audit log feature flag once the
          data pipeline is ready.
        </p>
      </section>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="border rounded p-4 bg-white shadow">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-3xl font-semibold">{value ?? '—'}</p>
  </div>
);
