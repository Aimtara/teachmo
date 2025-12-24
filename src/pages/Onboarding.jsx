import { useState } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { bootstrapOrganization, completeOnboarding } from '@/domains/onboarding';
import { logAnalyticsEvent } from '@/observability/telemetry';

export default function Onboarding() {
  const { isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();
  const [form, setForm] = useState({
    fullName: '',
    appRole: 'parent',
    organizationName: 'Demo District',
    schoolName: 'Demo School'
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  if (!isAuthenticated) return <p className="p-6">Please sign in to start onboarding.</p>;

  const handleChange = (evt) => {
    setForm({ ...form, [evt.target.name]: evt.target.value });
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setStatus('Setting up your organization…');
    setError('');

    try {
      const org = await bootstrapOrganization({
        organizationName: form.organizationName,
        schoolName: form.schoolName
      });

      setStatus('Creating your profile…');
      await completeOnboarding({
        userId: user?.id,
        fullName: form.fullName,
        appRole: form.appRole,
        organizationId: org?.organization?.id,
        schoolId: org?.school?.id
      });

      await logAnalyticsEvent(
        { organizationId: org?.organization?.id, schoolId: org?.school?.id },
        {
          eventName: 'onboarding_complete',
          actorId: user?.id,
          actorRole: form.appRole,
          metadata: {
            organization_id: org?.organization?.id,
            school_id: org?.school?.id
          },
          source: 'web'
        }
      );

      setStatus('Onboarding complete! You can continue to your dashboard.');
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-semibold mb-4">Welcome to Teachmo</h1>
      <p className="text-gray-600 mb-6">Tell us about yourself so we can set up your workspace.</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white shadow rounded p-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Full name</span>
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Role</span>
          <select
            name="appRole"
            value={form.appRole}
            onChange={handleChange}
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
            <option value="partner">Partner</option>
            <option value="system_admin">System Admin</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Organization</span>
          <input
            name="organizationName"
            value={form.organizationName}
            onChange={handleChange}
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">School</span>
          <input
            name="schoolName"
            value={form.schoolName}
            onChange={handleChange}
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Complete onboarding
        </button>

        {status && <p className="text-sm text-green-700">{status}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </div>
  );
}
