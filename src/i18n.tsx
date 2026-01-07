import React, { createContext, useContext, useState, useEffect } from 'react';

type Translations = Record<string, string>;

// Provide default translations for each supported locale.
export const translations: Record<string, Translations> = {
  en: {
    hello: 'Hello',
    // Add other English keys here
  },
  es: {
    hello: 'Hola',
    // Add other Spanish keys here
  },
};

interface I18nContextProps {
  locale: string;
  t: (key: string) => string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextProps>({
  locale: 'en',
  t: (key: string) => key,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    // Optionally load saved locale from storage
    const saved = localStorage.getItem('locale');
    if (saved) setLocale(saved);
  }, []);

  const value: I18nContextProps = {
    locale,
    t: (key: string) => {
      return translations[locale]?.[key] || key;
    },
    setLocale: (l: string) => {
      localStorage.setItem('locale', l);
      setLocale(l);
    },
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
