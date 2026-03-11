import { Link } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { useUserRole, getDefaultPathForRole } from '@/hooks/useUserRole';

export default function Landing() {
  const { isAuthenticated } = useAuthenticationStatus();
  const role = useUserRole();

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
          <p className="text-center text-sm text-gray-600">
            Select parent/guardian or school/district sign in to continue with the correct onboarding flow.
          </p>
          <Link
            to="/login"
            className="w-full inline-flex justify-center rounded-md bg-emerald-600 py-2 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Continue to sign in
          </Link>
          <p className="text-xs text-gray-500 text-center">
            By signing in you agree to the Teachmo privacy policy and acceptable use guidelines.
          </p>
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don&apos;t have an account? </span>
            <Link
              to="/login?flow=parent"
              className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              Start parent sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
