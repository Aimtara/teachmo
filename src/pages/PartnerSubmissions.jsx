import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';

const types = ['event', 'resource', 'offer'];

export default function PartnerSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [current, setCurrent] = useState('event');
  const [form, setForm] = useState({ title: '', description: '' });
  const userId = useUserId();
  const { data: scope } = useTenantScope();

  const tenantHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-user-id'] = userId;
    if (scope?.districtId) h['x-district-id'] = scope.districtId;
    if (scope?.schoolId) h['x-school-id'] = scope.schoolId;
    return h;
  }, [userId, scope?.districtId, scope?.schoolId]);

  const load = async () => {
    const data = await fetch(`${API_BASE_URL}/submissions`, { headers: tenantHeaders }).then((r) => r.json());
    setSubmissions(data);
  };

  useEffect(() => { load(); }, [tenantHeaders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tenantHeaders },
      body: JSON.stringify({ ...form, type: current }),
    });
    if (res.ok) {
      setForm({ title: '', description: '' });
      load();
    }
  };

  const updateTitle = async (id) => {
    const newTitle = window.prompt('Update submission title');
    if (!newTitle) return;
    await fetch(`${API_BASE_URL}/submissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...tenantHeaders },
      body: JSON.stringify({ title: newTitle }),
    });
    load();
  };

  return (
    <div>
      <h1>Submissions</h1>

      <div style={{ marginBottom: '1rem' }}>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setCurrent(t)}
            style={{ marginRight: '0.5rem', fontWeight: current === t ? 700 : 400 }}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit">Submit</button>
      </form>

      <ul>
        {submissions.map((s) => (
          <li key={s.id}>
            {s.title} ({s.type})
            <button onClick={() => updateTitle(s.id)} style={{ marginLeft: '0.5rem' }}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
