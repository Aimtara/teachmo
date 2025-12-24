import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';

export default function PartnerIncentives() {
  const [list, setList] = useState([]);
  const [apps, setApps] = useState([]);
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

  const load = async () => {
    const [incentives, applications] = await Promise.all([
      fetch(`${API_BASE_URL}/incentives`, { headers: tenantHeaders }).then((r) => r.json()),
      partnerId
        ? fetch(`${API_BASE_URL}/incentives/applications/${partnerId}`, { headers: tenantHeaders }).then((r) => r.json())
        : Promise.resolve([]),
    ]);
    setList(incentives);
    setApps(applications);
  };

  useEffect(() => { load(); }, [tenantHeaders, partnerId]);

  const apply = async (id) => {
    await fetch(`${API_BASE_URL}/incentives/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tenantHeaders },
      body: JSON.stringify({ partnerId }),
    });
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
