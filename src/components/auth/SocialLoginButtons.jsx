import { useState } from 'react';
import PropTypes from 'prop-types';
import { nhost } from '@/lib/nhostClient';

// Labels for known providers.  The values can be customized per tenant as needed.
const PROVIDER_LABELS = {
  google: 'Continue with Google',
  azuread: 'Continue with Microsoft',
  entraid: 'Continue with Microsoft',
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


const PROVIDER_ALIASES = {
  'microsoft-entra': 'entraid',
  'azure-ad': 'azuread',
  'microsoft-azuread': 'azuread',
  entraid: 'entraid',
};

function normalizeProviderId(provider) {
  if (typeof provider !== 'string') return '';
  const normalized = provider.trim().toLowerCase();
  return PROVIDER_ALIASES[normalized] || normalized;
}


/**
 * SocialLoginButtons renders a list of OAuth/social login buttons.
 * Pass an explicit providers array (list of provider IDs) to override
 * the default provider list.  Optionally include optional providers
 * if includeOptional=true.
 */
export function SocialLoginButtons({
  onError,
  includeOptional = false,
  providers = null,
  redirectTo = `${window.location.origin}/auth/callback`,
  onBeforeRedirect,
}) {
  const [activeProvider, setActiveProvider] = useState(null);

  const handleLogin = async (provider) => {
    const normalizedProvider = normalizeProviderId(provider);
    if (!normalizedProvider) {
      onError?.(new Error('Invalid identity provider.'));
      return;
    }

    setActiveProvider(normalizedProvider);
    try {
      onBeforeRedirect?.(normalizedProvider);
      const result = await nhost.auth.signIn({
        provider: normalizedProvider,
        options: {
          redirectTo,
        }
      });

      if (result?.error) {
        throw result.error;
      }
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
    providerList = [...new Set(providers
      .map((id) => normalizeProviderId(id))
      .filter(Boolean))]
      .map((id) => ({
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

SocialLoginButtons.propTypes = {
  onError: PropTypes.func,
  includeOptional: PropTypes.bool,
  providers: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
  onBeforeRedirect: PropTypes.func,
};
