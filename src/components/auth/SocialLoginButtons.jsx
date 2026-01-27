import { useState } from 'react';
import { nhost } from '@/lib/nhostClient';

// Labels for known providers.  The values can be customized per tenant as needed.
const PROVIDER_LABELS = {
  google: 'Continue with Google',
  azuread: 'Continue with Microsoft',
  microsoft: 'Continue with Microsoft',
  okta: 'Continue with Okta',
  classlink: 'Continue with ClassLink',
  clever: 'Continue with Clever',
  github: 'Continue with GitHub',
  facebook: 'Continue with Facebook',
  saml: 'Continue with SAML',
};

const BASE_PROVIDERS = [
  { id: 'google', label: PROVIDER_LABELS.google },
  { id: 'azuread', label: PROVIDER_LABELS.azuread },
];

const OPTIONAL_PROVIDERS = [
  { id: 'github', label: PROVIDER_LABELS.github },
  { id: 'facebook', label: PROVIDER_LABELS.facebook },
];

/**
 * SocialLoginButtons renders a list of OAuth/social login buttons.
 * Pass an explicit providers array (list of provider IDs) to override
 * the default provider list.  Optionally include optional providers
 * if includeOptional=true.
 */
export function SocialLoginButtons({ onError, includeOptional = false, providers = null }) {
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

  // Determine the set of providers to show.  If a custom providers array
  // is provided, map each id to a label using PROVIDER_LABELS.  Otherwise
  // fall back to the default base providers and include optional providers
  // when includeOptional is true.
  let providerList;
  if (Array.isArray(providers) && providers.length > 0) {
    providerList = providers.map((id) => ({
      id,
      label: PROVIDER_LABELS[id] || `Continue with ${id}`,
    }));
  } else {
    providerList = includeOptional
      ? [...BASE_PROVIDERS, ...OPTIONAL_PROVIDERS]
      : BASE_PROVIDERS;
  }

  return (
    <div className="space-y-3">
      {providerList.map(({ id, label }) => (
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
