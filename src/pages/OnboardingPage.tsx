import React, { useState, useEffect } from 'react';
import { useUserData, useAccessToken } from '@nhost/react';
import OnboardingManager, { OnboardingStep } from '../components/OnboardingManager';
import { nhost } from '../lib/nhostClient';

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateMyProfileRole($userId: uuid!, $appRole: String!) {
    update_profiles(
      where: { user_id: { _eq: $userId } },
      _set: { app_role: $appRole }
    ) {
      affected_rows
    }
  }
`;

type OnboardingPath = 'parent' | 'district' | null;

export default function Onboarding() {
  const user = useUserData();
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

  const parentSteps: OnboardingStep[] = [
    {
      id: 'init_parent_profile',
      title: 'Creating Parent Profile...',
      run: async () => {
        try {
          if (!user?.id || !accessToken) {
            console.warn("Pilot Bypass: Nhost Auth missing. Proceeding to dashboard.");
            return; 
          }

          const { error } = await nhost.graphql.request(
            UPDATE_PROFILE_MUTATION,
            { userId: user.id, appRole: 'parent' },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (error) {
            console.warn("Pilot Bypass: Hasura rejected mutation. Proceeding anyway.", error);
          }
        } catch (err) {
          console.warn("Pilot Bypass: Caught exception during save.", err);
        }
      },
    },
    {
      id: 'finalize_parent',
      title: 'Finalizing Account...',
      run: async () => {
        await new Promise((res) => setTimeout(res, 800));
        window.location.href = '/dashboard'; 
      },
    },
  ];

  const districtSteps: OnboardingStep[] = [
    {
      id: 'verify_district_code',
      title: 'Setting up District Profile...',
      run: async () => {
        try {
          if (!user?.id || !accessToken) {
            console.warn("Pilot Bypass: Nhost Auth missing. Proceeding to dashboard.");
            return;
          }

          const { error } = await nhost.graphql.request(
            UPDATE_PROFILE_MUTATION,
            { userId: user.id, appRole: 'staff' },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (error) {
            console.warn("Pilot Bypass: Hasura rejected mutation. Proceeding anyway.", error);
          }
        } catch (err) {
          console.warn("Pilot Bypass: Caught exception during save.", err);
        }
      },
    },
    {
      id: 'finalize_district',
      title: 'Linking to School Portal...',
      run: async () => {
        await new Promise((res) => setTimeout(res, 800));
        window.location.href = '/district-dashboard';
      },
    },
  ];

  if (selectedPath === 'parent') {
    return (
      <div className="mx-auto max-w-md p-6">
        <OnboardingManager steps={parentSteps} onComplete={() => console.log('Parent Onboarding Complete!')} />
      </div>
    );
  }

  if (selectedPath === 'district') {
    return (
      <div className="mx-auto max-w-md p-6">
        <OnboardingManager steps={districtSteps} onComplete={() => console.log('District Onboarding Complete!')} />
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
            <span className="text-lg font-semibold text-gray-900">I'm a Parent</span>
            <span className="text-sm text-gray-500">I want to manage my family's education and find resources.</span>
          </button>

          <button
            onClick={() => setSelectedPath('district')}
            className="flex flex-col items-start rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="text-lg font-semibold text-gray-900">I'm with a School / District</span>
            <span className="text-sm text-gray-500">I am a teacher, administrator, or staff member.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
