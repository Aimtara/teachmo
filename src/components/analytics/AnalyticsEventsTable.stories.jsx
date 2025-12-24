import { AnalyticsEventsTable } from './AnalyticsEventsTable';

export default {
  title: 'Analytics/AnalyticsEventsTable',
  component: AnalyticsEventsTable,
  tags: ['autodocs'],
};

const sampleRows = [
  {
    id: '1',
    event_ts: '2025-12-21T18:44:12.000Z',
    event_name: 'message.sent',
    actor_user_id: '33333333-3333-3333-3333-333333333333',
    entity_type: 'conversation',
    entity_id: '44444444-4444-4444-4444-444444444444',
    metadata: { channel: 'direct', source: 'ui' },
  },
  {
    id: '2',
    event_ts: '2025-12-21T18:50:02.000Z',
    event_name: 'auth.login',
    actor_user_id: '33333333-3333-3333-3333-333333333333',
    entity_type: 'user',
    entity_id: '33333333-3333-3333-3333-333333333333',
    metadata: { role: 'parent', source: 'client' },
  },
];

export const Default = {
  args: {
    title: 'Recent events',
    rows: sampleRows,
  },
};

export const Empty = {
  args: {
    title: 'No events',
    rows: [],
  },
};
