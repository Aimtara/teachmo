import { AnalyticsRollupTable } from './AnalyticsRollupTable';

export default {
  title: 'Analytics/AnalyticsRollupTable',
  component: AnalyticsRollupTable,
  tags: ['autodocs'],
};

const sampleRows = [
  {
    day: '2025-12-20',
    event_name: 'message.sent',
    district_id: '11111111-1111-1111-1111-111111111111',
    school_id: '22222222-2222-2222-2222-222222222222',
    event_count: 48,
  },
  {
    day: '2025-12-20',
    event_name: 'auth.login',
    district_id: '11111111-1111-1111-1111-111111111111',
    school_id: null,
    event_count: 120,
  },
  {
    day: '2025-12-21',
    event_name: 'workflow.dispatched',
    district_id: '11111111-1111-1111-1111-111111111111',
    school_id: null,
    event_count: 9,
  },
];

export const Default = {
  args: {
    rows: sampleRows,
    selectedEventName: 'message.sent',
  },
};

export const Empty = {
  args: {
    rows: [],
  },
};
