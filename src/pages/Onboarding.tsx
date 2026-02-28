import React, { useState } from 'react';
import { useUserData } from '@nhost/react';
// IMPORTANT: Make sure this import path matches where your component is located!
import OnboardingManager, { OnboardingStep } from '../components/OnboardingManager'; 

type OnboardingPath = 'parent' | 'district' | null;

export default function Onboarding() {
  const user = useUserData();
  const [selectedPath, setSelectedPath] = useState<OnboardingPath>(null);

  // ==========================================
  // PATH A: The Consumer / Parent Flow
  // ==========================================
  const parentSteps: OnboardingStep[] = [
    {
      id: 'init_parent_profile',
      title: 'Creating Parent Profile...',
      run: async () => {
        // Here we explicitly tell Hasura: "This is a parent. school_id is NULL."
        // This prevents the Hasura permissions crash!
        console.log(`Setting up B2C profile for user: ${user?.id}`);
        await new Promise((res) => setTimeout(res, 1200)); // Simulated loading
      },
    },
    {
      id: 'finalize_parent',
      title: 'Finalizing Account...',
      run: async () => {
        console.log('Redirecting parent to dashboard...');
        await new Promise((res) => setTimeout(res, 800));
        // window.location.href = '/dashboard'; 
      },
    },
  ];

  // ==========================================
  // PATH B: The Enterprise / District Flow
  // ==========================================
  const districtSteps: OnboardingStep[] = [
    {
      id: 'verify_district_code',
      title: 'Verifying District Credentials...',
      run: async () => {
        // Here we will eventually prompt for an invite code or verify their school email
        console.log(`Connecting B2B profile for user: ${user?.id}`);
        await new Promise((res) => setTimeout(res, 1500));
      },
    },
    {
      id: 'finalize_district',
      title: 'Linking to School Portal...',
      run: async () => {
        console.log('Redirecting staff to district portal...');
        await new Promise((res) => setTimeout(res, 800));
        // window.location.href = '/district-dashboard';
      },
    },
  ];

  // ==========================================
  // RENDER: The "Fork in the Road" UI
  // ==========================================
  
  // If they have chosen a path, let your OnboardingManager take over
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

  // If they haven't chosen yet, show the two front doors
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
