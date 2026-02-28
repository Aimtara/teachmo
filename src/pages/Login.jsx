import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { nhost } from '@/lib/nhostClient';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import useTenantSSOSettings from '@/hooks/useTenantSSOSettings';
import { createLogger } from '@/utils/logger';

const logger = createLogger('login');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  
  // NEW: State to track which path they chose before logging in
  const [selectedFlow, setSelectedFlow] = useState(null);

  // Fetch tenant SSO settings (enabled providers and requireSso flag)
  const { data: ssoSettings } = useTenantSSOSettings();
  const requireSso = ssoSettings?.requireSso || false;
  const enabledProviders = ssoSettings?.providers || [];

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await nhost.auth.signIn({
        email,
        password,
      });
    } catch (err) {
      logger.error('Email login failed', err);
      setError(err?.message || 'Login failed');
    }
  };

  // NEW: Function to save their intent and reveal the login form
  const handleFlowSelection = (flow) => {
    sessionStorage.setItem('onboarding_intent', flow);
    setSelectedFlow(flow);
  };

  // ==========================================
  // PHASE 1: The Pre-Login "Fork in the Road"
  // ==========================================
  if (!selectedFlow) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Welcome to Teachmo</h1>
          <p className="mb-8 text-center text-gray-600">How will you be using the platform?</p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleFlowSelection('parent')}
              className="flex flex-col items-start rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-sky-500 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <span className="text-lg font-semibold text-gray-900">I'm a Parent or Guardian</span>
              <span className="text-sm text-gray-500">Manage your family's education and resources.</span>
            </button>

            <button
              onClick={() => handleFlowSelection('district')}
              className="flex flex-col items-start rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span className="text-lg font-semibold text-gray-900">I'm with a School or District</span>
              <span className="text-sm text-gray-500">Log in as a teacher, administrator, or staff member.</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PHASE 2: The Actual Login Form
  // ==========================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* NEW: A back button so they can change their mind */}
        <button 
          onClick={() => setSelectedFlow(null)}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr; Back to roles
        </button>

        <div className="text-center space-y-2">
          {/* Dynamic header based on their selection! */}
          <h1 className="text-2xl font-semibold text-gray-900">
            {selectedFlow === 'parent' ? 'Sign in as a Parent' : 'Sign in to your School Account'}
          </h1>
          <p className="text-sm text-gray-600">Use your preferred method to continue</p>
        </div>
        
        {error && (
          <p role="alert" className="text-red-600 text-sm text-center">
            {error}
          </p>
        )}

        {/* Automatically redirect to the only enabled SSO provider when required */}
        {requireSso && enabledProviders.length === 1 && (
          <AutoSSORedirect
            provider={enabledProviders[0]}
            onError={(err) => setError(err?.message || 'Login failed')}
            onStart={() => setRedirecting(true)}
          />
        )}

        {/* Show redirect message when auto-redirecting */}
        {redirecting && (
          <p className="text-center text-sm text-gray-500">Redirecting to your single sign-on provider…</p>
        )}

        {/* If multiple providers or SSO optional, show provider buttons */}
        {(!requireSso || enabledProviders.length !== 1) && (
          <SocialLoginButtons
            onError={(err) => setError(err?.message || 'Login failed')}
            providers={enabledProviders.length ? enabledProviders : null}
          />
        )}

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 px-2 text-gray-500">or</span>
          </div>
        </div>

        {!requireSso && (
          <form className="mt-8 space-y-4" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center rounded-md bg-emerald-600 py-2 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Sign in
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <Link 
            to="/onboarding" 
            className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Sign up for free
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * AutoSSORedirect triggers an immediate signIn with the given provider when mounted.
 * It calls onStart before initiating the redirect and onError if the call fails.
 */
function AutoSSORedirect({ provider, onStart, onError }) {
  useEffect(() => {
    async function go() {
      try {
        onStart?.();
        await nhost.auth.signIn({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      } catch (err) {
        logger.error('SSO redirect failed', err);
        onError?.(err);
      }
    }
    if (provider) {
      go();
    }
  }, [onError, onStart, provider]);
  return null;
}
