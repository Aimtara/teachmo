import React from 'react';
import { useTranslation } from '@/i18n';
import { Select } from '@/components/ui';

/**
 * LanguageSwitcher
 * Dropdown component to switch between available locales.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const options = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    // Extend with additional languages as needed
  ];
  return (
    <Select
      label="Language"
      value={locale}
      onChange={(e: any) => setLocale(e.target.value)}
      options={options}
    />
  );
}
