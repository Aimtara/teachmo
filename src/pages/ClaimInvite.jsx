import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { DirectoryInvitesAPI } from '@/api/adapters';
import { getDefaultPathForRole } from '@/hooks/useUserRole';

const CARD_CLASS = 'bg-white shadow rounded-lg p-6 space-y-4';

export default function ClaimInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const user = useUserData();
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState('');
  const [loadingContext, setLoadingContext] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimed, setClaimed] = useState(false);

  const defaultDashboard = useMemo(() => getDefaultPathForRole('parent'), []);
  const userEmail = useMemo(() => (user?.email || '').toLowerCase(), [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadContext() {
      setLoadingContext(true);
      setContextError('');
      try {
        const resp = await DirectoryInvitesAPI.getClaimContext(token);
        if (!cancelled) setContext(resp ?? null);
      } catch (error) {
        console.error('get-claim-context failed', error);
        if (!cancelled) setContextError(error?.message || 'Could not load invite');
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    }

    if (token) loadContext();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (claimed) {
      navigate(defaultDashboard, { replace: true });
    }
  }, [claimed, navigate, defaultDashboard]);

  const handleClaim = useCallback(async () => {
    if (!token || claiming) return;
    setClaiming(true);
    setClaimError('');
    try {
      const resp = await DirectoryInvitesAPI.claimInvite(token);
      if (resp?.linked) {
        setClaimed(true);
      } else {
        setClaimError(resp?.reason || 'Unable to claim invite');
      }
    } catch (error) {
      console.error('claim-invite failed', error);
      setClaimError(error?.message || 'Unable to claim invite');
    } finally {
      setClaiming(false);
    }
  }, [token, claiming]);

  const maskedEmail = context?.email || 'your account email';
  const expired = context && context.valid === false;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-sky-600">Teachmo</p>
          <h1 className="text-3xl font-bold text-gray-900">Claim your invite</h1>
          <p className="text-gray-600">Connect your account to continue.</p>
        </div>

        <div className={CARD_CLASS}>
          {loadingContext ? (
            <p className="text-gray-600">Checking your invite…</p>
          ) : null}

          {contextError ? (
            <p className="text-red-600 text-sm">{contextError}</p>
          ) : null}

          {!loadingContext && !contextError ? (
            <>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Invite for</p>
                <p className="text-lg font-semibold text-gray-900">{maskedEmail}</p>
                {context?.expiresAt ? (
                  <p className="text-xs text-gray-500">
                    Expires {new Date(context.expiresAt).toLocaleString()}
                  </p>
                ) : null}
              </div>

              {expired ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  This invite is no longer valid. Please request a new invite from your school.
                </div>
              ) : null}

              {claimError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {claimError}
                </div>
              ) : null}

              {!isAuthenticated && !expired ? (
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Sign in with the email shown above to claim this invite.
                  </p>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center px-4 py-2 rounded bg-sky-600 text-white hover:bg-sky-700"
                    >
                      Go to sign in
                    </Link>
                    <p className="text-sm text-gray-500">We&apos;ll bring you back here after signing in.</p>
                  </div>
                </div>
              ) : null}

              {isAuthenticated && !isLoading && !expired ? (
                <div className="space-y-3">
                  <div className="rounded border border-sky-100 bg-sky-50 p-3 text-sm text-sky-800">
                    Signed in as <strong>{userEmail || 'unknown user'}</strong>. Make sure this matches the invite.
                  </div>
                  <button
                    type="button"
                    onClick={handleClaim}
                    className="w-full inline-flex justify-center px-4 py-2 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                    disabled={claiming}
                  >
                    {claiming ? 'Linking…' : 'Claim invite'}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
