import { useEffect, useState } from 'react';
import { createPartnerSubmission, listPartnerSubmissions } from '@/domains/submissions';
import { useUserData } from '@nhost/react';

export default function PartnerDashboard() {
  const user = useUserData();
  const [submissions, setSubmissions] = useState([]);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    listPartnerSubmissions(user.id)
      .then(setSubmissions)
      .catch(() => setSubmissions([]));
  }, [user]);

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!user) return;
    setStatus('Submitting…');
    await createPartnerSubmission({ partner_id: user.id, title });
    const refreshed = await listPartnerSubmissions(user.id);
    setSubmissions(refreshed);
    setTitle('');
    setStatus('Submission created');
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Partner dashboard</h1>
        <p className="text-gray-600">Track submissions and their review status.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">New submission title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Create submission</button>
        {status && <p className="text-sm text-green-700">{status}</p>}
      </form>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Submission history</h2>
        <ul className="space-y-2 text-sm">
          {submissions.map((submission) => (
            <li key={submission.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <p className="font-semibold">{submission.title}</p>
                <p className="text-gray-500">Created {new Date(submission.created_at).toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{submission.status}</span>
            </li>
          ))}
          {submissions.length === 0 && <p className="text-gray-500">No submissions yet.</p>}
        </ul>
      </div>
    </div>
  );
}
