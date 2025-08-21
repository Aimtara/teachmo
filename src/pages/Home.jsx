import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  return (
    <main id="main">
      <h1>{t('welcome')}</h1>
    </main>
  );
}
