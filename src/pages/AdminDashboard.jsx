import { useState } from 'react';
import { bootstrapOrganization } from '@/domains/onboarding';
import { createProfile } from '@/domains/auth';

export default function AdminDashboard() {
  const [orgForm, setOrgForm] = useState({ organizationName: '', schoolName: '' });
  const [userForm, setUserForm] = useState({ userId: '', fullName: '', role: 'teacher', organizationId: '', schoolId: '' });
  const [message, setMessage] = useState('');

  const handleOrgSubmit = async (evt) => {
    evt.preventDefault();
    const data = await bootstrapOrganization({
      organizationName: orgForm.organizationName,
      schoolName: orgForm.schoolName
    });
    setMessage(`Created/updated organization ${data.organization?.name}`);
  };

  const handleUserSubmit = async (evt) => {
    evt.preventDefault();
    await createProfile({
      user_id: userForm.userId,
      full_name: userForm.fullName,
      app_role: userForm.role,
      organization_id: userForm.organizationId || null,
      school_id: userForm.schoolId || null
    });
    setMessage('User role saved');
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <p className="text-gray-600">Manage organizations, schools, and roles.</p>
      </header>

      <form onSubmit={handleOrgSubmit} className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-medium">Create organization & school</h2>
        <input
          placeholder="Organization name"
          value={orgForm.organizationName}
          onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          placeholder="School name"
          value={orgForm.schoolName}
          onChange={(e) => setOrgForm({ ...orgForm, schoolName: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
      </form>

      <form onSubmit={handleUserSubmit} className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-medium">Assign user role</h2>
        <input
          placeholder="User ID"
          value={userForm.userId}
          onChange={(e) => setUserForm({ ...userForm, userId: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          placeholder="Full name"
          value={userForm.fullName}
          onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <select
          value={userForm.role}
          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="parent">Parent</option>
          <option value="teacher">Teacher</option>
          <option value="partner">Partner</option>
          <option value="system_admin">System admin</option>
          <option value="school_admin">School admin</option>
          <option value="district_admin">District admin</option>
        </select>
        <input
          placeholder="Organization ID"
          value={userForm.organizationId}
          onChange={(e) => setUserForm({ ...userForm, organizationId: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
        <input
          placeholder="School ID"
          value={userForm.schoolId}
          onChange={(e) => setUserForm({ ...userForm, schoolId: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save role</button>
      </form>

      {message && <p className="text-green-700 text-sm">{message}</p>}
    </div>
  );
}
