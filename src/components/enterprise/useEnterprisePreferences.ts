import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'teachmo_enterprise_preferences';

export const DEFAULT_ENTERPRISE_PREFERENCES = {
  theme: 'light',
  density: 'comfortable',
  landingPage: '/admin/command-center',
  notifications: 'critical',
  role: 'system_admin'
};

function readStoredPreferences() {
  if (typeof window === 'undefined') return DEFAULT_ENTERPRISE_PREFERENCES;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_ENTERPRISE_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_ENTERPRISE_PREFERENCES;
  }
}

export function applyEnterpriseTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('tm-high-contrast', theme === 'highContrast');
  root.dataset.enterpriseTheme = theme;
}

export function useEnterprisePreferences() {
  const [preferences, setPreferencesState] = useState(readStoredPreferences);

  useEffect(() => {
    applyEnterpriseTheme(preferences.theme);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.enterpriseDensity = preferences.density;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  const setPreference = useCallback((key, value) => {
    setPreferencesState((current) => ({ ...current, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_ENTERPRISE_PREFERENCES);
  }, []);

  return useMemo(
    () => ({ preferences, setPreference, resetPreferences }),
    [preferences, resetPreferences, setPreference]
  );
}
