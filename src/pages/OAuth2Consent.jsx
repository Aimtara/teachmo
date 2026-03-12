import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { nhost } from '@/lib/nhostClient';
import { logger } from '@/observability/logger';

const ALLOWED_REDIRECT_SCHEMES = new Set(['https:', 'http:']);

function isSafeRedirectUri(uri) {
  try {
    const { protocol } = new URL(uri);
    return ALLOWED_REDIRECT_SCHEMES.has(protocol);
  } catch {
    return false;
  }
}

function ScopeBadge({ scope }) {
  return <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{scope}</span>;
}

export default function OAuth2Consent() {
  const [searchParams] = useSearchParams();
  const requestId = useMemo(() => searchParams.get('request_id') || '', [searchParams]);
  const { isAuthenticated } = useAuthenticationStatus();

  const [requestDetails, setRequestDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingDeny, setLoadingDeny] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setLoadingDetails(false);
      setError('Missing request_id. Start this flow from the third-party app.');
      return;
    }

    let cancelled = false;

    const loadRequestDetails = async () => {
      setLoadingDetails(true);
      setError('');
      try {
        const response = await nhost.auth.oauth2LoginGet({
          request_id: requestId,
        });

        if (response?.error) {
          throw response.error;
        }

        if (!cancelled) {
          setRequestDetails(response.body);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load this authorization request.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    };

    loadRequestDetails();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loginLoading) return;

    setError('');
    setLoginLoading(true);

    try {
      const result = await nhost.auth.signIn({
        email: email.trim(),
        password,
      });

      if (result?.error) {
        throw result.error;
      }
    } catch (err) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!requestId || loadingApprove) return;

    setError('');
    setLoadingApprove(true);

    try {
      const consentResponse = await nhost.auth.oauth2LoginPost({
        request_id: requestId,
      });

      if (consentResponse?.error) {
        throw consentResponse.error;
      }

      const redirectUri = consentResponse?.body?.redirectUri || consentResponse?.body?.redirect_uri;
      if (!redirectUri) {
        throw new Error('No redirect URI was returned by Nhost Auth.');
      }

      if (!isSafeRedirectUri(redirectUri)) {
        logger.warn('OAuth2 approve: unsafe redirect URI scheme blocked', {});
        throw new Error('The redirect URI returned by the server uses an unsafe scheme.');
      }

      window.location.href = redirectUri;
    } catch (err) {
      setError(err?.message || 'Could not approve this request.');
      setLoadingApprove(false);
    }
  };

  const handleDeny = () => {
    if (loadingDeny) return;

    setLoadingDeny(true);

    const clientRedirectUri = requestDetails?.redirectUri || requestDetails?.redirect_uri;
    if (clientRedirectUri) {
      try {
        const url = new URL(clientRedirectUri);
        if (!isSafeRedirectUri(clientRedirectUri)) {
          logger.warn('OAuth2 deny: unsafe redirect URI scheme blocked, falling back to home', {});
        } else {
          url.searchParams.set('error', 'access_denied');
          url.searchParams.set('error_description', 'The resource owner denied the authorization request.');
          const state = requestDetails?.state;
          if (state) {
            url.searchParams.set('state', state);
          }
          window.location.href = url.toString();
          return;
        }
      } catch (err) {
        logger.warn('OAuth2 deny: invalid redirect URI, falling back to home', { error: err });
      }
    }

    window.location.href = '/';
  };

  const clientId = requestDetails?.clientId || requestDetails?.client_id;
  const redirectUri = requestDetails?.redirectUri || requestDetails?.redirect_uri;
  const scopes = requestDetails?.scopes || [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="space-y-2 border-b border-gray-100 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">OAuth2 Authorization</p>
          <h1 className="text-2xl font-semibold text-gray-900">Review and approve access</h1>
          <p className="text-sm text-gray-600">
            A third-party application is requesting access to your Teachmo account through Nhost Auth.
          </p>
        </header>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loadingDetails ? (
          <p className="mt-6 text-sm text-gray-600">Loading authorization request…</p>
        ) : requestDetails ? (
          <>
            <dl className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Client ID</dt>
                <dd className="mt-1 break-all text-sm font-medium text-gray-900">{clientId || 'Unknown client'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Redirect URI</dt>
                <dd className="mt-1 break-all text-sm text-gray-700">{redirectUri || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Request ID</dt>
                <dd className="mt-1 break-all text-sm text-gray-700">{requestId}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Requested scopes</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {scopes.length ? scopes.map((scope) => <ScopeBadge key={scope} scope={scope} />) : <span className="text-sm text-gray-600">No scopes requested</span>}
                </dd>
              </div>
            </dl>

            {!isAuthenticated ? (
              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <h2 className="text-sm font-semibold text-gray-900">Sign in to continue</h2>
                <div>
                  <label htmlFor="oauth-email" className="sr-only">Email address</label>
                  <input
                    id="oauth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label htmlFor="oauth-password" className="sr-only">Password</label>
                  <input
                    id="oauth-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-emerald-700">You are signed in. Continue to approve or deny access.</p>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loadingApprove}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingApprove ? 'Approving…' : 'Approve and continue'}
                </button>
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={loadingDeny || loadingApprove}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingDeny ? 'Denying…' : 'Deny access'}
                </button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

ScopeBadge.propTypes = {
  scope: PropTypes.string.isRequired,
};
