import { useEffect, useState } from 'react';
import { bootstrapOrganization } from '@/domains/onboarding';
import { createProfile } from '@/domains/auth';
import { API_BASE_URL } from '@/config/api';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { useTelemetry } from '@/utils/useTelemetry';
import { useTenant } from '@/contexts/TenantContext';
import { nhost } from '@/lib/nhostClient';

export default function AdminDashboard() {
  const [orgForm, setOrgForm] = useState({ organizationName: '', schoolName: '' });
  const [userForm, setUserForm] = useState({ userId: '', fullName: '', role: 'teacher', organizationId: '', schoolId: '' });
  const [message, setMessage] = useState('');
  const [metrics, setMetrics] = useState({});
  const { log } = useTelemetry();
  const tenant = useTenant();

  useEffect(() => {
    if (tenant.loading || !tenant.organizationId) return;
    const load = async () => {
      const token = await nhost.auth.getAccessToken();
      const headers = {};
      if (token) headers.authorization = `Bearer ${token}`;
      headers['x-teachmo-org-id'] = tenant.organizationId;
      if (tenant.schoolId) headers['x-teachmo-school-id'] = tenant.schoolId;
      fetch(`${API_BASE_URL}/admin/metrics`, { headers })
        .then((res) => res.json())
        .then(setMetrics)
        .catch(() => setMetrics({}));
    };
    load();
  }, [tenant.loading, tenant.organizationId, tenant.schoolId]);

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
    await createProfile({
      user_id: userForm.userId,
      full_name: userForm.fullName,
      role: userForm.role,
      district_id: userForm.organizationId || null,
      school_id: userForm.schoolId || null
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
        <Stat label="Active Parents (7d)" value={metrics.active_parents} />
        <Stat label="Messages Sent (24h)" value={metrics.messages_sent} />
        <Stat label="Workflows Run (total)" value={metrics.workflows_run} />
        <Stat label="Average AI Latency (ms)" value={metrics.ai_latency} />
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

      <AuditLogViewer />
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="border rounded p-4 bg-white shadow">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-3xl font-semibold">{value ?? '—'}</p>
  </div>
);
