import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { partnerRequest } from '@/api/partner/client';

export default function PartnerPortal() {
  const tenant = useTenant();
  const [stats, setStats] = useState({ submissions: 0, enrollments: 0, applications: 0, contracts: 0 });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (tenant.loading || !tenant.organizationId) return;
    async function load() {
      const [subs, enrolls, apps, contracts] = await Promise.all([
        partnerRequest('/submissions', { method: 'GET' }, tenant),
        partnerRequest('/courses/enrollments/me', { method: 'GET' }, tenant),
        partnerRequest('/incentives/applications/me', { method: 'GET' }, tenant),
        partnerRequest('/contracts', { method: 'GET' }, tenant)
      ]);
      setStats({
        submissions: subs.length,
        enrollments: enrolls.length,
        applications: apps.length,
        contracts: contracts.length
      });
      setActivity(subs.slice(-5).reverse());
    }
    load();
  }, [tenant.loading, tenant.organizationId, tenant.schoolId]);

  return (
    <div>
      <h1>Partner Dashboard</h1>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>Submissions: {stats.submissions}</div>
        <div>Courses Enrolled: {stats.enrollments}</div>
        <div>Incentive Applications: {stats.applications}</div>
        <div>Contracts: {stats.contracts}</div>
      </div>
      <nav style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <Link to="/partners/submissions">Manage Submissions</Link>
        <Link to="/partners/training">Training</Link>
        <Link to="/partners/incentives">Incentives</Link>
      </nav>
      <h2 style={{ marginTop: '1rem' }}>Recent Activity</h2>
      <ul>
        {activity.map((a) => (
          <li key={a.id}>{a.created_at}: {a.title} ({a.status})</li>
        ))}
      </ul>
    </div>
  );
}
