import React, { useEffect, useState } from 'react';
import { Page, Card, Button, TextInput, Select, Textarea, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminNotificationCampaigns
 * Admin interface to create, schedule and view tenant-wide or segmented notification campaigns.
 */
export default function AdminNotificationCampaigns() {
  const { hasPermission } = usePermissions();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>({
    name: '',
    message: '',
    segment: 'all',
    schedule: 'now',
    sendAt: '',
  });
  const [loading, setLoading] = useState(false);

  const loadCampaigns = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query ListCampaigns {
            notification_campaigns(order_by: { created_at: desc }) {
              id
              name
              message
              segment
              schedule
              send_at
              status
            }
          }
        `,
        {}
      );
      setCampaigns(res?.notification_campaigns || []);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_notifications')) {
      loadCampaigns();
    }
  }, [hasPermission]);

  const createCampaign = async () => {
    setLoading(true);
    try {
      await nhost.graphql.request(
        `
          mutation InsertCampaign($object: notification_campaigns_insert_input!) {
            insert_notification_campaigns_one(object: $object) { id }
          }
        `,
        { object: campaign }
      );
      setCampaign({ name: '', message: '', segment: 'all', schedule: 'now', sendAt: '' });
      loadCampaigns();
    } catch (err) {
      console.error('Failed to create campaign', err);
    } finally {
      setLoading(false);
    }
  };

  const segmentOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'parents', label: 'Parents' },
    { value: 'teachers', label: 'Teachers' },
    { value: 'students', label: 'Students' },
    // Additional segments can be added based on SIS groups
  ];

  return (
    <Page title="Notification Campaigns">
      {!hasPermission('manage_notifications') ? (
        <p>You do not have permission to manage notification campaigns.</p>
      ) : (
        <>
          <p>Create and schedule tenant-wide announcements or targeted campaigns.</p>
          <Card className="p-4 space-y-3 mb-4">
            <h3 className="text-lg font-semibold">Create Campaign</h3>
            <TextInput
              label="Campaign Name"
              value={campaign.name}
              onChange={(e: any) => setCampaign({ ...campaign, name: e.target.value })}
            />
            <Textarea
              label="Message"
              value={campaign.message}
              onChange={(e: any) => setCampaign({ ...campaign, message: e.target.value })}
            />
            <Select
              label="Target Segment"
              value={campaign.segment}
              onChange={(e: any) => setCampaign({ ...campaign, segment: e.target.value })}
              options={segmentOptions}
            />
            <Select
              label="Schedule"
              value={campaign.schedule}
              onChange={(e: any) => setCampaign({ ...campaign, schedule: e.target.value })}
              options={[
                { value: 'now', label: 'Send Now' },
                { value: 'later', label: 'Schedule for Later' },
              ]}
            />
            {campaign.schedule === 'later' && (
              <TextInput
                label="Send At (ISO date/time)"
                type="datetime-local"
                value={campaign.sendAt}
                onChange={(e: any) => setCampaign({ ...campaign, sendAt: e.target.value })}
              />
            )}
            <Button onClick={createCampaign} disabled={loading}>
              Create Campaign
            </Button>
          </Card>
          <h3 className="text-lg font-semibold mb-2">Existing Campaigns</h3>
          <Table
            data={campaigns}
            columns={[
              { Header: 'Name', accessor: 'name' },
              { Header: 'Segment', accessor: 'segment' },
              { Header: 'Schedule', accessor: 'schedule' },
              { Header: 'Send At', accessor: 'send_at' },
              { Header: 'Status', accessor: 'status' },
            ]}
          />
        </>
      )}
    </Page>
  );
}
