import { useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { partnerRequest } from '@/api/partner/client';

const types = ['event', 'resource', 'offer'];

export default function PartnerSubmissions() {
  const tenant = useTenant();
  const [submissions, setSubmissions] = useState([]);
  const [current, setCurrent] = useState('event');
  const [form, setForm] = useState({ title: '', description: '' });

  const load = async () => {
    if (!tenant.organizationId) return;
    const data = await partnerRequest('/submissions', { method: 'GET' }, tenant);
    setSubmissions(data);
  };

  useEffect(() => { load(); }, [tenant.organizationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await partnerRequest(
      '/submissions',
      {
        method: 'POST',
        body: JSON.stringify({ ...form, type: current })
      },
      tenant
    );
    setForm({ title: '', description: '' });
    load();
  };

  const handleEdit = async (id) => {
    const newTitle = prompt('New title');
    if (!newTitle) return;
    await partnerRequest(
      `/submissions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle })
      },
      tenant
    );
    load();
  };

  const filtered = submissions.filter((s) => s.type === current);

  return (
    <div>
      <h1>Submissions</h1>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {types.map((t) => (
          <button key={t} onClick={() => setCurrent(t)} disabled={current === t}>{t}</button>
        ))}
      </div>
      <ul>
        {filtered.map((s) => (
          <li key={s.id}>
            {s.title} - {s.status}
            {s.status === 'pending' && <button onClick={() => handleEdit(s.id)}>Edit</button>}
            {s.status === 'rejected' && s.reason && <span> (Reason: {s.reason})</span>}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
        <button type="submit">Submit {current}</button>
      </form>
    </div>
  );
}
