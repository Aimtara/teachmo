import React, { useState } from 'react';
import { useUserData } from '@nhost/react';
// IMPORTANT: Make sure this import path matches where your component is located!
import OnboardingManager, { OnboardingStep } from '../components/OnboardingManager'; 
import { nhost } from '../lib/nhostClient'; // Adjust path if needed

// The CORRECTED GraphQL instruction to save the profile
const CREATE_PROFILE_MUTATION = `
  mutation CreateUserProfile($userId: uuid!, $role: String!, $schoolId: uuid, $districtId: uuid) {
    insert_user_profiles_one(
      object: {
        user_id: $userId,
        role: $role,
        school_id: $schoolId,
        district_id: $districtId
      }, 
      on_conflict: {
        constraint: user_profiles_pkey, 
        update_columns: [role, school_id, district_id]
      }
    ) {
      user_id
    }
  }
`;

type OnboardingPath = 'parent' | 'district' | null;

export default function Onboarding() {
  const user = useUserData();
// 1. Read the post-it note as soon as the page loads
  const [selectedPath, setSelectedPath] = useState<OnboardingPath>(() => {
    const savedIntent = sessionStorage.getItem('onboarding_intent');
    return (savedIntent as OnboardingPath) || null;
  });

  // 2. Throw the post-it note away so it doesn't haunt future logins
  React.useEffect(() => {
    if (selectedPath) {
      sessionStorage.removeItem('onboarding_intent');
    }
  }, [selectedPath]);

  // ==========================================
  // PATH A: The Consumer / Parent Flow
  // ==========================================
  const parentSteps: OnboardingStep[] = [
    {
      id: 'init_parent_profile',
      title: 'Creating Parent Profile...',
      run: async () => {
        if (!user?.id) throw new Error("No authenticated user found.");
        
        const { error } = await nhost.graphql.request(CREATE_PROFILE_MUTATION, {
          userId: user.id,
          role: 'parent',
          schoolId: null,
          districtId: null
        });

        if (error) {
          console.error("Hasura Error:", error);
          throw new Error("Failed to save parent profile.");
        }
      },
    },
    {
      id: 'finalize_parent',
      title: 'Finalizing Account...',
      run: async () => {
        await new Promise((res) => setTimeout(res, 800));
        window.location.href = '/dashboard'; // Send them into the app!
      },
    },
  ];

  // ==========================================
  // PATH B: The Enterprise / District Flow
  // ==========================================
  const districtSteps: OnboardingStep[] = [
    {
      id: 'verify_district_code',
      title: 'Setting up District Profile...',
      run: async () => {
        if (!user?.id) throw new Error("No authenticated user found.");
        
        // Note: In the future, you can capture a real schoolId from a text input 
        // on the screen and pass it here instead of null!
        const { error } = await nhost.graphql.request(CREATE_PROFILE_MUTATION, {
          userId: user.id,
          role: 'staff', 
          schoolId: null,
          districtId: null
        });

        if (error) {
          console.error("Hasura Error:", error);
          throw new Error("Failed to save district profile.");
        }
      },
    },
    {
      id: 'finalize_district',
      title: 'Linking to School Portal...',
      run: async () => {
        await new Promise((res) => setTimeout(res, 800));
        window.location.href = '/district-dashboard'; // Send them to the enterprise portal
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
