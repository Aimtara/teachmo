import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

export default function PartnerIncentives() {
  const [list, setList] = useState([]);
  const [apps, setApps] = useState([]);
  const partnerId = 'demo';

  const load = async () => {
    const [incentives, applications] = await Promise.all([
      fetch(`${API_BASE_URL}/incentives`).then((r) => r.json()),
      fetch(`${API_BASE_URL}/incentives/applications/${partnerId}`).then((r) => r.json()),
    ]);
    setList(incentives);
    setApps(applications);
  };

  useEffect(() => { load(); }, []);

  const apply = async (id) => {
    await fetch(`${API_BASE_URL}/incentives/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId }),
    });
    load();
  };

  const appMap = Object.fromEntries(apps.map((a) => [a.incentiveId, a]));

  return (
    <div>
      <h1>Incentives</h1>
      {list.map((i) => {
        const app = appMap[i.id];
        return (
          <div key={i.id} style={{ border: '1px solid #ccc', margin: '1rem', padding: '1rem' }}>
            <h2>{i.title} (${i.value})</h2>
            <p>{i.description}</p>
            {!app && <button onClick={() => apply(i.id)}>Apply</button>}
            {app && <p>Status: {app.status}{app.payout && ` - Payout: ${app.payout}`}</p>}
          </div>
        );
      })}
    </div>
  );
}
