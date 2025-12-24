import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';
import { useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';

export default function PartnerPortal() {
  const [stats, setStats] = useState({ submissions: 0, enrollments: 0, applications: 0, contracts: 0 });
  const [activity, setActivity] = useState([]);
  const userId = useUserId();
  const { data: scope } = useTenantScope();
  const partnerId = userId;

  const tenantHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-user-id'] = userId;
    if (scope?.districtId) h['x-district-id'] = scope.districtId;
    if (scope?.schoolId) h['x-school-id'] = scope.schoolId;
    return h;
  }, [userId, scope?.districtId, scope?.schoolId]);

  useEffect(() => {
    async function load() {
      const asArray = async (resp) => (resp.ok ? resp.json() : []);
      const [subs, enrolls, apps, contracts, audits] = await Promise.all([
        fetch(`${API_BASE_URL}/submissions`, { headers: tenantHeaders }).then(asArray),
        partnerId
          ? fetch(`${API_BASE_URL}/courses/enrollments/${partnerId}`, { headers: tenantHeaders }).then(asArray)
          : Promise.resolve([]),
        partnerId
          ? fetch(`${API_BASE_URL}/incentives/applications/${partnerId}`, { headers: tenantHeaders }).then(asArray)
          : Promise.resolve([]),
        fetch(`${API_BASE_URL}/contracts?partnerId=${partnerId ?? ''}`, { headers: tenantHeaders }).then(asArray),
        fetch(`${API_BASE_URL}/admin/audits`, { headers: tenantHeaders }).then(asArray),
      ]);
      setStats({
        submissions: subs.length,
        enrollments: enrolls.length,
        applications: apps.length,
        contracts: contracts.length
      });
      setActivity(audits.slice(-5).reverse());
    }
    load();
  }, [partnerId, tenantHeaders]);

  return (
    <div>
      <h1>Partner portal</h1>
      <p>Review your submissions and activity.</p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div><strong>{stats.submissions}</strong> submissions</div>
        <div><strong>{stats.enrollments}</strong> enrollments</div>
        <div><strong>{stats.applications}</strong> incentives</div>
        <div><strong>{stats.contracts}</strong> contracts</div>
      </div>

      <h2>Recent activity</h2>
      <ul>
        {activity.map((a) => (
          <li key={a.id}>{a.event_type} - {a.summary}</li>
        ))}
      </ul>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/partner/submissions">View submissions</Link>
      </div>
    </div>
  );
}
