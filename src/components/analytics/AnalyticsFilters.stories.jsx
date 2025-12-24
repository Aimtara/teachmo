import { useState } from 'react';
import { AnalyticsFilters } from './AnalyticsFilters';

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
        onRefresh={() => console.log('refresh')}
        onExportCsv={() => console.log('export csv')}
        onExportPdf={() => console.log('export pdf')}
      />
    </div>
  );
}

export const Default = {
  render: () => <Demo />,
};
