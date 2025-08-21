import React, { createContext, useContext, useState, useEffect } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { es, zhCN, enUS } from 'date-fns/locale';

const locales = {
  en: enUS,
  es: es,
  zh: zhCN
};

// Basic translations - in a real app, these would be loaded from translation files
const translations = {
  en: {
    'dashboard': 'Dashboard',
    'discover': 'Discover',
    'community': 'Community',
    'calendar': 'Calendar',
    'messages': 'Messages',
    'settings': 'Settings',
    'good_morning': 'Good morning',
    'good_afternoon': 'Good afternoon',
    'good_evening': 'Good evening',
    'loading': 'Loading...',
    'error_occurred': 'An error occurred',
    'try_again': 'Try again',
    'welcome_back': 'Welcome back',
    'activities_completed': 'Activities completed',
    'weekly_streak': '{{count}} day streak',
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit'
  },
  es: {
    'dashboard': 'Panel de Control',
    'discover': 'Descubrir',
    'community': 'Comunidad',
    'calendar': 'Calendario',
    'messages': 'Mensajes',
    'settings': 'Configuración',
    'good_morning': 'Buenos días',
    'good_afternoon': 'Buenas tardes',
    'good_evening': 'Buenas noches',
    'loading': 'Cargando...',
    'error_occurred': 'Ocurrió un error',
    'try_again': 'Intentar de nuevo',
    'welcome_back': 'Bienvenido de vuelta',
    'activities_completed': 'Actividades completadas',
    'weekly_streak': '{{count}} días seguidos',
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'delete': 'Eliminar',
    'edit': 'Editar'
  },
  zh: {
    'dashboard': '仪表板',
    'discover': '发现',
    'community': '社区',
    'calendar': '日历',
    'messages': '消息',
    'settings': '设置',
    'good_morning': '早上好',
    'good_afternoon': '下午好',
    'good_evening': '晚上好',
    'loading': '加载中...',
    'error_occurred': '发生错误',
    'try_again': '重试',
    'welcome_back': '欢迎回来',
    'activities_completed': '已完成的活动',
    'weekly_streak': '连续{{count}}天',
    'save': '保存',
    'cancel': '取消',
    'delete': '删除',
    'edit': '编辑'
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
  const [locale, setLocaleState] = useState(() => {
    // Try to get locale from localStorage or browser
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teachmo-locale');
      if (stored && Object.keys(translations).includes(stored)) {
        return stored;
      }
      
      // Try to detect from browser language
      const browserLang = navigator.language.split('-')[0];
      if (Object.keys(translations).includes(browserLang)) {
        return browserLang;
      }
    }
    return defaultLocale;
  });

  const setLocale = (newLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teachmo-locale', newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = rtlLanguages.has(newLocale) ? 'rtl' : 'ltr';
    }
  };

  const t = (key, params) => {
    let translation = translations[locale]?.[key] || translations.en[key] || key;
    
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
    return dateFnsFormat(dateObj, formatStr, { locale: locales[locale] });
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