import { useEffect, useMemo, useState } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { useNavigate } from 'react-router-dom';
import { bootstrapOrganization, completeOnboarding } from '@/domains/onboarding';
import { getDefaultPathForRole, useUserRoleState } from '@/hooks/useUserRole';
import { trackEvent } from '@/observability/telemetry';

export default function Onboarding() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const user = useUserData();
  const navigate = useNavigate();
  const { role, loading: roleLoading, needsOnboarding } = useUserRoleState();

  const isPrivilegedBootstrap = useMemo(() => role === 'system_admin', [role]);

  const [form, setForm] = useState({
    fullName: '',
    organizationName: 'Demo District',
    schoolName: 'Demo School'
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isLoading || roleLoading) return;
    // If the user is already onboarded, bounce them to their default home.
    if (!needsOnboarding) navigate(getDefaultPathForRole(role), { replace: true });
  }, [isAuthenticated, isLoading, roleLoading, needsOnboarding, role, navigate]);

  if (isLoading || roleLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAuthenticated) return <p className="p-6">Please sign in to start onboarding.</p>;

  const handleChange = (evt) => {
    setForm({ ...form, [evt.target.name]: evt.target.value });
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setStatus(isPrivilegedBootstrap ? 'Setting up your organization…' : 'Saving your profile…');
    setError('');

    void trackEvent({
      eventName: 'onboarding.started',
      entityType: 'user',
      entityId: user?.id,
      metadata: { role, organizationName: form.organizationName, schoolName: form.schoolName },
    });

    try {
      let org = null;
      if (isPrivilegedBootstrap) {
        org = await bootstrapOrganization({
          organizationName: form.organizationName,
          schoolName: form.schoolName
        });
      }

      setStatus('Updating your profile…');
      await completeOnboarding({
        userId: user?.id,
        fullName: form.fullName,
        appRole: role,
        organizationId: org?.organization?.id,
        schoolId: org?.school?.id,
        allowTenantWrite: Boolean(isPrivilegedBootstrap && org?.organization?.id),
        privilegedInsert: Boolean(isPrivilegedBootstrap)
      });

      void trackEvent({
        eventName: 'onboarding.completed',
        entityType: 'user',
        entityId: user?.id,
        metadata: { role, organizationId: org?.organization?.id ?? null, schoolId: org?.school?.id ?? null },
      });

      setStatus('Onboarding complete! Redirecting…');
      navigate(getDefaultPathForRole(role), { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('');

      void trackEvent({
        eventName: 'onboarding.failed',
        entityType: 'user',
        entityId: user?.id,
        metadata: { message: err?.message || 'unknown' },
      });
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

        <div className="rounded border bg-gray-50 p-3 text-sm text-gray-700">
          <div className="font-medium">Detected role</div>
          <div className="mt-1">{role}</div>
          {!isPrivilegedBootstrap && (
            <p className="mt-2 text-xs text-gray-600">
              Your organization and school are assigned by your invitation/tenant configuration.
            </p>
          )}
        </div>

        {isPrivilegedBootstrap && (
          <>
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
          </>
        )}

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
