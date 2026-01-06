import { useState } from 'react';
import { nhost } from '@/lib/nhostClient';

const BASE_PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'azuread', label: 'Continue with Microsoft' },
];

const OPTIONAL_PROVIDERS = [
  { id: 'github', label: 'Continue with GitHub' },
  { id: 'facebook', label: 'Continue with Facebook' },
];

export function SocialLoginButtons({ onError, includeOptional = false }) {
  const [activeProvider, setActiveProvider] = useState(null);

  const handleLogin = async (provider) => {
    setActiveProvider(provider);
    try {
      await nhost.auth.signIn({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
    } catch (error) {
      console.error('OAuth login failed', error);
      onError?.(error);
      setActiveProvider(null);
    }
  };

  const providers = includeOptional ? [...BASE_PROVIDERS, ...OPTIONAL_PROVIDERS] : BASE_PROVIDERS;

  return (
    <div className="space-y-3">
      {providers.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleLogin(id)}
          aria-label={label}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          disabled={Boolean(activeProvider)}
        >
          {activeProvider === id ? 'Redirecting…' : label}
        </button>
      ))}
    </div>
  );
}

export default SocialLoginButtons;
