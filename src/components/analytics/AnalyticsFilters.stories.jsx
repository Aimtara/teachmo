import { useState } from 'react';
import { AnalyticsFilters } from './AnalyticsFilters';
import { createLogger } from '@/utils/logger';

const logger = createLogger('analytics-filters-story');
const isDevelopment =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

export default {
  title: 'Analytics/AnalyticsFilters',
  component: AnalyticsFilters,
  tags: ['autodocs'],
};

function Demo() {
  const [value, setValue] = useState({
    from: '2025-12-10',
    to: '2025-12-24',
    role: null,
    eventName: null,
  });

  return (
    <div className="p-6 max-w-3xl">
      <AnalyticsFilters
        value={value}
        onChange={setValue}
        onRefresh={() => {
          if (isDevelopment) logger.debug('refresh');
        }}
        onExportCsv={() => {
          if (isDevelopment) logger.debug('export csv');
        }}
        onExportPdf={() => {
          if (isDevelopment) logger.debug('export pdf');
        }}
      />
    </div>
  );
}

export const Default = {
  render: () => <Demo />,
};
