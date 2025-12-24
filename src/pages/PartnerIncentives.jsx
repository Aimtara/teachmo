import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { partnerRequest } from '@/api/partner/client';

export default function PartnerIncentives() {
  const tenant = useTenant();
  const [list, setList] = useState([]);
  const [apps, setApps] = useState([]);

  const load = async () => {
    if (!tenant.organizationId) return;
    const [incentives, applications] = await Promise.all([
      partnerRequest('/incentives', { method: 'GET' }, tenant),
      partnerRequest('/incentives/applications/me', { method: 'GET' }, tenant)
    ]);
    setList(incentives);
    setApps(applications);
  };

  useEffect(() => { load(); }, [tenant.organizationId]);

  const apply = async (id) => {
    await partnerRequest(`/incentives/${id}/apply`, { method: 'POST' }, tenant);
    load();
  };

  const appMap = Object.fromEntries(apps.map((a) => [a.incentive_id, a]));

  return (
    <div>
      <h1>Incentives</h1>
      {list.map((i) => {
        const app = appMap[i.id];
        return (
          <div key={i.id} style={{ border: '1px solid #ccc', margin: '1rem', padding: '1rem' }}>
            <h2>{i.title} {i.value ? `($${i.value})` : ''}</h2>
            <p>{i.description}</p>
            {!app && <button onClick={() => apply(i.id)}>Apply</button>}
            {app && <p>Status: {app.status}{app.payout && ` - Payout: ${app.payout}`}</p>}
          </div>
        );
      })}
    </div>
  );
}
