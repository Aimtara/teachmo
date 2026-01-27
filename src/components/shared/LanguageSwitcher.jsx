import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from './InternationalizationProvider';
import { useStore } from '@/components/hooks/useStore';
import { isFeatureEnabled } from '@/utils/featureFlags';

const localeLabels = {
  en: 'English',
  es: 'Español',
  zh: '中文',
};

export default function LanguageSwitcher({ className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, setLocale, availableLocales, t } = useTranslation();
  const enabled = useStore((state) => {
    const flags = state.featureFlags ?? {};
    if (Object.prototype.hasOwnProperty.call(flags, 'FEATURE_I18N')) {
      return Boolean(flags.FEATURE_I18N);
    }
    return isFeatureEnabled('FEATURE_I18N');
  });

  if (!enabled) return null;

  const resolveLabel = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const handleChange = (event) => {
    const nextLocale = event.target.value;
    setLocale(nextLocale);
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('lang', nextLocale);
    navigate({ pathname: location.pathname, search: searchParams.toString() }, { replace: true });
  };

  return (
    <label className={`flex items-center gap-2 text-sm text-gray-700 ${className}`}>
      <span className="sr-only">{resolveLabel('language_switcher.label', 'Language')}</span>
      <select
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        aria-label={resolveLabel('language_switcher.label', 'Language')}
        onChange={handleChange}
        value={locale}
      >
        {availableLocales.map((code) => (
          <option key={code} value={code}>
            {resolveLabel(`language_switcher.options.${code}`, localeLabels[code] || code)}
          </option>
        ))}
      </select>
    </label>
  );
}
