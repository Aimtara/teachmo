import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

const types = ['event', 'resource', 'offer'];

export default function PartnerSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [current, setCurrent] = useState('event');
  const [form, setForm] = useState({ title: '', description: '' });

  const load = async () => {
    const data = await fetch(`${API_BASE_URL}/submissions`).then((r) => r.json());
    setSubmissions(data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, type: current }),
    });
    if (res.ok) {
      setForm({ title: '', description: '' });
      load();
    }
  };

  const handleEdit = async (id) => {
    const newTitle = prompt('New title');
    if (!newTitle) return;
    await fetch(`${API_BASE_URL}/submissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
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
