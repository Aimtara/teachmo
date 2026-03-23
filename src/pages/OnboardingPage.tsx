import React, { useState, useEffect } from 'react';
import { useUserData, useAccessToken } from '@nhost/react';
import OnboardingManager, { OnboardingStep } from '../components/OnboardingManager';
import { nhost } from '../lib/nhostClient';
import { getDefaultPathForRole } from '@/config/rbac';
import { useNavigate } from 'react-router-dom';

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
    const savedIntent = sessionStorage.getItem('onboarding_intent');
    return (savedIntent as OnboardingPath) || null;
  });

  useEffect(() => {
    if (selectedPath) {
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
      <div className="mx-auto max-w-md p-6">
        <OnboardingManager steps={parentSteps} onComplete={() => undefined} />
      </div>
    );
  }

  if (selectedPath === 'district') {
    return (
      <div className="mx-auto max-w-md p-6">
        <OnboardingManager steps={districtSteps} onComplete={() => undefined} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Welcome to Teachmo!</h1>
        <p className="mb-8 text-center text-gray-600">How will you be using the platform today?</p>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setSelectedPath('parent')}
            className="flex flex-col items-start rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-sky-500 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            <span className="text-lg font-semibold text-gray-900">I’m a Parent</span>
            <span className="text-sm text-gray-500">I want to manage my family’s education and find resources.</span>
          </button>

          <button
            onClick={() => setSelectedPath('district')}
            className="flex flex-col items-start rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="text-lg font-semibold text-gray-900">I’m with a School / District</span>
            <span className="text-sm text-gray-500">I am a teacher, administrator, or staff member.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
