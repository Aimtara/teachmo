import React from 'react';
import { User } from '@/api/entities';

export function useAuthGuard() {
  const [user, setUser] = React.useState(null);
  const [status, setStatus] = React.useState('loading');
  const [error, setError] = React.useState(null);

  const loadUser = React.useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const profile = await User.me();
      setUser(profile);
      setStatus('authenticated');
    } catch (err) {
      setError(err);
      const message = err?.message || '';
      if (message.toLowerCase().includes('unauthorized')) {
        setStatus('unauthorized');
      } else {
        setStatus('error');
      }
    }
  }, []);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  return { user, status, error, refresh: loadUser };
}

export function AuthGuardState({ status, error, onRetry }) {
  if (status === 'loading') {
    return (
      <div className="p-6 text-center text-gray-600" role="status">
        Checking your session...
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded" role="alert">
        <p className="font-semibold text-amber-800">Your session has expired</p>
        <p className="text-amber-700">Please sign in again to continue.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded" role="alert">
        <p className="font-semibold text-red-800">We hit a connection issue</p>
        <p className="text-red-700 mb-3">Please try again in a moment.</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white rounded"
          style={{ backgroundColor: 'var(--teachmo-sage)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}
