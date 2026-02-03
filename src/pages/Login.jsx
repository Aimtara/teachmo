import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to Teachmo</h1>
          <p className="text-sm text-gray-600">Use your school account to continue</p>
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
        {/* If multiple providers or SSO optional, show provider buttons */}
        {(!requireSso || enabledProviders.length !== 1) && (
          <SocialLoginButtons
            onError={(err) => setError(err?.message || 'Login failed')}
            providers={enabledProviders.length ? enabledProviders : null}
          />
        )}
        {/* Show redirect message when auto-redirecting */}
        {redirecting && (
          <p className="text-center text-sm text-gray-500">Redirecting to your single sign-on provider…</p>
        )}
        <div className="relative">
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
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
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
              <label htmlFor="password" className="sr-only">
                Password
              </label>
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
        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link to="/onboarding" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
<div className="mt-6 text-center text-sm">
  <span className="text-gray-600">Don't have an account? </span>
  <Link 
    to="/onboarding" 
    className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
  >
    Sign up for free
  </Link>
</div>
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
