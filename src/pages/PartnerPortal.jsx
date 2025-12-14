import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';

export default function PartnerPortal() {
  const [stats, setStats] = useState({ submissions: 0, enrollments: 0, applications: 0, contracts: 0 });
  const [activity, setActivity] = useState([]);
  const partnerId = 'demo';

  useEffect(() => {
    async function load() {
      const [subs, enrolls, apps, contracts, audits] = await Promise.all([
        fetch(`${API_BASE_URL}/submissions`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/courses/enrollments/${partnerId}`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/incentives/applications/${partnerId}`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/contracts?partnerId=${partnerId}`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/admin/audits`).then((r) => r.json()),
      ]);
      setStats({
        submissions: subs.length,
        enrollments: enrolls.length,
        applications: apps.length,
        contracts: contracts.length,
      });
      setActivity(audits.slice(-5).reverse());
    }
    load();
  }, []);

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
        <Link to="/submissions">Manage Submissions</Link>
        <Link to="/training">Training</Link>
        <Link to="/incentives">Incentives</Link>
      </nav>
      <h2 style={{ marginTop: '1rem' }}>Recent Activity</h2>
      <ul>
        {activity.map((a) => (
          <li key={a.id}>{a.timestamp}: {a.entity} {a.action}</li>
        ))}
      </ul>
    </div>
  );
}
