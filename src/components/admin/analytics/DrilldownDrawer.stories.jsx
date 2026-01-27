import { useState } from 'react';
import DrilldownDrawer from './DrilldownDrawer';

export default {
  title: 'Admin Analytics/DrilldownDrawer',
  component: DrilldownDrawer,
  tags: ['autodocs']
};

export const Default = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return <DrilldownDrawer {...args} open={open} onOpenChange={setOpen} />;
  },
  args: {
    metricKey: 'message_sent',
    rows: [
      { event_name: 'message_sent', event_ts: new Date().toISOString(), actor_id: 'user-1', actor_role: 'parent', metadata: { channel: 'sms' } },
      { event_name: 'message_sent', event_ts: new Date().toISOString(), actor_id: 'user-2', actor_role: 'teacher', metadata: { channel: 'email' } }
    ],
    onExportCsv: () => {},
    onExportPdf: () => {}
  }
};
