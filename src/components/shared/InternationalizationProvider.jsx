import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { es, zhCN, enUS } from 'date-fns/locale';

const locales = {
  en: enUS,
  es: es,
  zh: zhCN
};

const preloadLocale = async (locale) => {
  try {
    const module = await import(`./translations/${locale}.json`);
    return module.default;
  } catch (error) {
    console.warn(`Falling back to English translations; failed to load ${locale}`, error);
    const fallback = await import('./translations/en.json');
    return fallback.default;
  }
};

const I18nContext = createContext(null);

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
};

const rtlLanguages = new Set(['ar', 'he', 'fa', 'ur']);

export const I18nProvider = ({ children, defaultLocale = 'en' }) => {
  const [translations, setTranslations] = useState({});
  const loadedLocales = useRef(new Set());
  const [locale, setLocaleState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teachmo-locale');
      if (stored) {
        return stored;
      }

      const browserLang = navigator.language.split('-')[0];
      return browserLang || defaultLocale;
    }
    return defaultLocale;
  });

  const loadLocale = useCallback(async (targetLocale) => {
    if (loadedLocales.current.has(targetLocale)) return;

    const localeData = await preloadLocale(targetLocale);
    loadedLocales.current.add(targetLocale);
    setTranslations((prev) => ({
      ...prev,
      [targetLocale]: localeData,
    }));
  }, []);

  const setLocale = (newLocale) => {
    setLocaleState(newLocale);
    loadLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teachmo-locale', newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = rtlLanguages.has(newLocale) ? 'rtl' : 'ltr';
    }
  };

  useEffect(() => {
    loadLocale(defaultLocale);
  }, [defaultLocale, loadLocale]);

  useEffect(() => {
    loadLocale(locale);
  }, [locale, loadLocale]);

  const resolveTranslation = (source, key) => {
    if (!source) return undefined;
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
    if (!key.includes('.')) {
      return undefined;
    }
    return key.split('.').reduce((value, part) => {
      if (value && typeof value === 'object' && part in value) {
        return value[part];
      }
      return undefined;
    }, source);
  };

  const t = (key, params) => {
    const localeStrings = translations[locale] || translations[defaultLocale] || {};
    const defaultStrings = translations[defaultLocale] || {};

    let translation =
      resolveTranslation(localeStrings, key) ||
      resolveTranslation(defaultStrings, key) ||
      key;
    
    // Simple parameter replacement
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });
    }
    
    return translation;
  };

  const formatDate = (date, formatStr = 'PPP') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateFnsFormat(dateObj, formatStr, { locale: locales[locale] || locales.en });
  };

  const formatNumber = (num, options) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale, options).format(num);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale, {
      style: 'currency',
      currency
    }).format(amount);
  };

  const isRTL = rtlLanguages.has(locale);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [locale, isRTL]);

  const contextValue = {
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    isRTL
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};
