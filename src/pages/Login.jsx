import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useSearchParams } from 'react-router-dom';
import { nhost } from '@/lib/nhostClient';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import useTenantSSOSettings from '@/hooks/useTenantSSOSettings';
import { createLogger } from '@/utils/logger';
import {
  ONBOARDING_FLOWS,
  getSavedOnboardingFlowPreference,
  normalizeOnboardingFlow,
  saveOnboardingFlowPreference,
} from '@/lib/onboardingFlow';

const logger = createLogger('login');
const AUTH_MODES = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialFlow = useMemo(() => {
    const flowParam = searchParams.get('flow');
    if (flowParam !== null) return normalizeOnboardingFlow(flowParam);
    return getSavedOnboardingFlowPreference();
  }, [searchParams]);

  const [selectedFlow, setSelectedFlow] = useState(initialFlow);
  const isFirstRender = useRef(true);
  const [authMode, setAuthMode] = useState(AUTH_MODES.SIGN_IN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const { data: ssoSettings } = useTenantSSOSettings();
  const requireSso = ssoSettings?.requireSso || false;
  const enabledProviders = ssoSettings?.providers || [];
  const oauthRedirectTo = `${window.location.origin}/auth/callback?flow=${selectedFlow}`;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveOnboardingFlowPreference(selectedFlow);
    setError(null);
    setNotice('');
    if (selectedFlow === ONBOARDING_FLOWS.DISTRICT) {
      setAuthMode(AUTH_MODES.SIGN_IN);
    }
  }, [selectedFlow]);

  const handleFlowChange = (flow) => {
    setSelectedFlow(flow);
    saveOnboardingFlowPreference(flow);
  };

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice('');

    try {
      saveOnboardingFlowPreference(selectedFlow);
      await nhost.auth.signIn({
        email,
        password,
      });
    } catch (err) {
      logger.error('Email login failed', err);
      setError(err?.message || 'Login failed');
    }
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      saveOnboardingFlowPreference(ONBOARDING_FLOWS.PARENT);
      const { session, error: signUpError } = await nhost.auth.signUp({
        email,
        password,
        options: {
          displayName: fullName || undefined,
          metadata: {
            preferred_active_role: 'parent',
            onboarding_flow: ONBOARDING_FLOWS.PARENT,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (session) {
        await nhost.auth.refreshSession();
        window.location.assign('/onboarding/parent');
        return;
      }

      setNotice('Account created. Check your email to verify your account, then sign in to complete onboarding.');
      setAuthMode(AUTH_MODES.SIGN_IN);
    } catch (err) {
      logger.error('Email sign up failed', err);
      setError(err?.message || 'Could not create account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to Teachmo</h1>
          <p className="text-sm text-gray-600">Choose the right sign-in flow for your account type.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleFlowChange(ONBOARDING_FLOWS.PARENT)}
            className={`rounded-xl border p-4 text-left transition ${
              selectedFlow === ONBOARDING_FLOWS.PARENT
                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-emerald-200'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Parent or guardian</p>
            <p className="mt-1 text-sm text-gray-600">
              Consumer account for families. No district pre-provisioning required.
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleFlowChange(ONBOARDING_FLOWS.DISTRICT)}
            className={`rounded-xl border p-4 text-left transition ${
              selectedFlow === ONBOARDING_FLOWS.DISTRICT
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-indigo-200'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">School or district</p>
            <p className="mt-1 text-sm text-gray-600">
              Staff and invited users with tenant-managed access and SSO configuration.
            </p>
          </button>
        </div>

        <div className="mx-auto max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <p role="alert" className="text-red-600 text-sm text-center">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-emerald-700 text-center">{notice}</p>}

          {requireSso && enabledProviders.length === 1 && selectedFlow === ONBOARDING_FLOWS.DISTRICT && (
            <AutoSSORedirect
              provider={enabledProviders[0]}
              redirectTo={oauthRedirectTo}
              onError={(err) => setError(err?.message || 'Login failed')}
              onStart={() => setRedirecting(true)}
            />
          )}

          {(!requireSso || enabledProviders.length !== 1 || selectedFlow === ONBOARDING_FLOWS.PARENT) && (
            <SocialLoginButtons
              onError={(err) => setError(err?.message || 'Login failed')}
              providers={
                selectedFlow === ONBOARDING_FLOWS.DISTRICT && enabledProviders.length ? enabledProviders : null
              }
              redirectTo={oauthRedirectTo}
              onBeforeRedirect={() => saveOnboardingFlowPreference(selectedFlow)}
            />
          )}

          {redirecting && selectedFlow === ONBOARDING_FLOWS.DISTRICT && (
            <p className="text-center text-sm text-gray-500">Redirecting to your single sign-on provider…</p>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>

          {!requireSso || selectedFlow === ONBOARDING_FLOWS.PARENT ? (
            <form className="space-y-4" onSubmit={authMode === AUTH_MODES.SIGN_UP ? handleCreateAccount : handleEmailLogin}>
              {selectedFlow === ONBOARDING_FLOWS.PARENT && authMode === AUTH_MODES.SIGN_UP && (
                <div>
                  <label htmlFor="fullName" className="sr-only">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              )}
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
              {selectedFlow === ONBOARDING_FLOWS.PARENT && authMode === AUTH_MODES.SIGN_UP && (
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">Confirm password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full flex justify-center rounded-md bg-emerald-600 py-2 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {authMode === AUTH_MODES.SIGN_UP ? 'Create account' : 'Sign in'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-center text-gray-600">
              District SSO is required for this tenant. Use your configured identity provider above.
            </p>
          )}

          {selectedFlow === ONBOARDING_FLOWS.PARENT ? (
            <p className="text-center text-sm text-gray-600">
              {authMode === AUTH_MODES.SIGN_IN ? 'Need a parent account? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setAuthMode(authMode === AUTH_MODES.SIGN_IN ? AUTH_MODES.SIGN_UP : AUTH_MODES.SIGN_IN)}
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {authMode === AUTH_MODES.SIGN_IN ? 'Create a new account' : 'Sign in instead'}
              </button>
            </p>
          ) : (
            <p className="text-center text-sm text-gray-600">
              Need an invite?{' '}
              <Link to="/onboarding" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Start district onboarding
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AutoSSORedirect({ provider, onStart, onError, redirectTo = `${window.location.origin}/auth/callback` }) {
  useEffect(() => {
    async function go() {
      try {
        onStart?.();
        await nhost.auth.signIn({
          provider,
          options: {
            redirectTo,
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
  }, [onError, onStart, provider, redirectTo]);

  return null;
}

AutoSSORedirect.propTypes = {
  provider: PropTypes.string,
  onStart: PropTypes.func,
  onError: PropTypes.func,
  redirectTo: PropTypes.string,
};
