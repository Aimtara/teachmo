import React, { useState, useEffect } from 'react';
import { useUserData, useAccessToken } from '@nhost/react';
import OnboardingManager, { OnboardingStep } from '../components/OnboardingManager';
import { nhost } from '../lib/nhostClient';
import { getDefaultPathForRole } from '@/config/rbac';
import { useNavigate } from 'react-router-dom';
import { EnterprisePanel, EnterpriseSurface, EnterpriseWorkflowList } from '@/components/enterprise';

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateMyProfile($userId: uuid!, $appRole: String!, $fullName: String!) {
    update_profiles(
      where: { user_id: { _eq: $userId } },
      _set: { app_role: $appRole, full_name: $fullName }
    ) {
      affected_rows
    }
  }
`;

const INSERT_PROFILE_MUTATION = `
  mutation CreateMyProfile($userId: uuid!, $appRole: String!, $fullName: String!) {
    insert_profiles_one(object: { user_id: $userId, app_role: $appRole, full_name: $fullName }) {
      id
    }
  }
`;

type OnboardingPath = 'parent' | 'district' | null;

export default function Onboarding() {
  const user = useUserData();
  const navigate = useNavigate();
  const accessToken = useAccessToken();

  const [selectedPath, setSelectedPath] = useState<OnboardingPath>(() => {
    const savedIntent = localStorage.getItem('onboarding_intent') || sessionStorage.getItem('onboarding_intent');
    return (savedIntent as OnboardingPath) || null;
  });

  useEffect(() => {
    if (selectedPath) {
      localStorage.setItem('onboarding_intent', selectedPath);
      sessionStorage.removeItem('onboarding_intent');
    }
  }, [selectedPath]);

  const resolveFullName = () => {
    const metadataName = typeof user?.metadata?.full_name === 'string' ? user.metadata.full_name.trim() : '';
    const displayName = typeof user?.displayName === 'string' ? user.displayName.trim() : '';
    const emailName = typeof user?.email === 'string' ? user.email.split('@')[0] : '';

    return metadataName || displayName || emailName || 'Teachmo User';
  };

  const persistProfile = async (appRole: 'parent' | 'teacher') => {
    if (!user?.id || !accessToken) {
      throw new Error('You must be signed in to complete onboarding.');
    }

    const fullName = resolveFullName();
    const headers = { headers: { Authorization: `Bearer ${accessToken}` } };

    const { data: updated, error: updateError } = await nhost.graphql.request(
      UPDATE_PROFILE_MUTATION,
      { userId: user.id, appRole, fullName },
      headers
    );

    if (updateError) {
      throw updateError;
    }

    if ((updated as { update_profiles?: { affected_rows?: number } })?.update_profiles?.affected_rows) {
      return;
    }

    const { error: insertError } = await nhost.graphql.request(
      INSERT_PROFILE_MUTATION,
      { userId: user.id, appRole, fullName },
      headers
    );

    if (insertError) {
      throw insertError;
    }
  };

const parentSteps: OnboardingStep[] = [
    {
      id: 'init_parent_profile',
      title: 'Creating Parent Profile...',
      run: async () => {
        await persistProfile('parent');
      },
    },
    {
      id: 'finalize_parent',
      title: 'Finalizing Account...',
      run: async () => {
        await new Promise((res) => setTimeout(res, 800));
        navigate(getDefaultPathForRole('parent'), { replace: true });
      },
    },
  ];

  const districtSteps: OnboardingStep[] = [
    {
      id: 'verify_district_code',
      title: 'Setting up District Profile...',
      run: async () => {
        await persistProfile('teacher');
      },
    },
    {
      id: 'finalize_district',
      title: 'Linking to School Portal...',
      run: async () => {
        await new Promise((res) => setTimeout(res, 800));
        navigate(getDefaultPathForRole('teacher'), { replace: true });
      },
    },
  ];

  if (selectedPath === 'parent') {
    return (
      <EnterpriseSurface
        eyebrow="Onboarding"
        title="Parent setup wizard"
        description="Autosaved setup creates the parent profile, links family context, and resumes progress if the session is interrupted."
        badges={['Autosave', 'AI guidance', 'Localized copy', 'WCAG AA']}
      >
        <EnterprisePanel title="Progressive setup" description="Each step saves progress before moving the family into Today.">
          <OnboardingManager steps={parentSteps} onComplete={() => undefined} />
        </EnterprisePanel>
      </EnterpriseSurface>
    );
  }

  if (selectedPath === 'district') {
    return (
      <EnterpriseSurface
        eyebrow="Onboarding"
        title="Educator and district setup wizard"
        description="The staff path prepares teacher, administrator, and district workflows with saved progress and AI-assisted setup guidance."
        badges={['Autosave', 'Roster guidance', 'SSO-ready', 'WCAG AA']}
      >
        <EnterprisePanel title="Progressive setup" description="Profile and school context save before opening the role dashboard.">
          <OnboardingManager steps={districtSteps} onComplete={() => undefined} />
        </EnterprisePanel>
      </EnterpriseSurface>
    );
  }

  return (
    <EnterpriseSurface
      eyebrow="Role-aware onboarding"
      title="Welcome to Teachmo"
      description="Choose a path to start a progressive wizard with autosave, contextual AI guidance, localization-ready copy, and role-specific next steps."
      badges={['Saved progress', 'AI tips', 'Parent', 'Teacher', 'Partner', 'Admin']}
      metrics={[
        { label: 'Wizard paths', value: '5', badge: 'Role-aware', trend: 'up' },
        { label: 'Completion target', value: '+15%', badge: 'Goal', trend: 'up' },
        { label: 'Resume state', value: 'On', badge: 'Autosave', trend: 'flat' },
        { label: 'Guidance', value: 'AI', badge: 'Contextual', trend: 'up' }
      ]}
      aside={
        <EnterprisePanel title="AI setup guide" description="Users see only the next useful setup action.">
          <EnterpriseWorkflowList
            items={[
              { label: 'Parents', status: 'Calm', tone: 'success' },
              { label: 'Teachers', status: 'Triage', tone: 'info' },
              { label: 'Partners', status: 'CMS', tone: 'warning' },
              { label: 'Admins', status: 'Command', tone: 'danger' }
            ]}
          />
        </EnterprisePanel>
      }
    >
      <EnterprisePanel title="Choose your role" description="The selected path is saved so setup can resume safely.">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setSelectedPath('parent')}
            className="enterprise-focus enterprise-motion flex flex-col items-start rounded-2xl border border-[var(--enterprise-border)] p-4 text-left hover:-translate-y-0.5 hover:border-[var(--enterprise-primary)]"
          >
            <span className="text-lg font-semibold">I’m a Parent</span>
            <span className="text-sm text-[var(--enterprise-muted)]">Manage family education, privacy, resources, and the three-card Today view.</span>
          </button>

          <button
            onClick={() => setSelectedPath('district')}
            className="enterprise-focus enterprise-motion flex flex-col items-start rounded-2xl border border-[var(--enterprise-border)] p-4 text-left hover:-translate-y-0.5 hover:border-[var(--enterprise-success)]"
          >
            <span className="text-lg font-semibold">I’m with a School / District</span>
            <span className="text-sm text-[var(--enterprise-muted)]">Set up teacher, administrator, district, SSO, roster, and governance workflows.</span>
          </button>
        </div>
      </EnterprisePanel>
    </EnterpriseSurface>
  );
}
