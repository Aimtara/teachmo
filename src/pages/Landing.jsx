import { useState } from 'react';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';
import { useUserRole, getDefaultPathForRole } from '@/hooks/useUserRole';

export default function Landing() {
  const { isAuthenticated } = useAuthenticationStatus();
  const role = useUserRole();
  const [error, setError] = useState(null);

  if (isAuthenticated) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white flex items-center justify-center px-4">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold tracking-wide text-sage-600">Teachmo</p>
          <h1 className="text-4xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-lg text-gray-600">Sign in with your district or social account to continue.</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-8 space-y-6">
          <SocialLoginButtons onError={setError} />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error.message || 'Something went wrong while connecting to your provider.'}
            </p>
          )}
          <p className="text-xs text-gray-500 text-center">
            By signing in you agree to the Teachmo privacy policy and acceptable use guidelines.
          <div className="mt-6 text-center text-sm">
  <span className="text-gray-600">Don't have an account? </span>
  <Link 
    to="/onboarding" 
    className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
  >
    Sign up for free
  </Link>
</div>
          </p>
        </div>
      </div>
    </div>
  );
}
