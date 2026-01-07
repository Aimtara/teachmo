import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Select, LoadingSpinner } from '@/components/ui';

/**
 * AdminNotificationMetrics shows deliverability metrics for notification
 * campaigns. Administrators can select a campaign to view sent, delivered,
 * opened, clicked and unsubscribed counts, as well as bounce rates. This page
 * complements the Notification Campaigns page by providing visibility into
 * campaign performance.
 */
export default function AdminNotificationMetrics() {
  const [campaignId, setCampaignId] = useState('');

  // Fetch all campaigns to populate selector
  const { data: campaigns = [] } = useQuery(
    ['notificationCampaigns'],
    async () => {
      const res = await graphqlRequest({
        query: `query NotificationCampaigns {
          notification_campaigns(order_by: {created_at: desc}) {
            id
            name
          }
        }`,
      });
      return res?.notification_campaigns ?? [];
    },
  );

  // Fetch metrics for the selected campaign
  const {
    data: metrics = null,
    isLoading,
  } = useQuery(
    ['notificationMetrics', campaignId],
    async () => {
      if (!campaignId) return null;
      const res = await graphqlRequest({
        query: `query NotificationMetrics($id: uuid!) {
          notification_campaign_metrics_by_pk(id: $id) {
            id
            sent
            delivered
            opened
            clicked
            bounces
            unsubscribed
          }
        }`,
        variables: { id: campaignId },
      });
      return res?.notification_campaign_metrics_by_pk ?? null;
    },
    { enabled: !!campaignId },
  );

  const handleChange = (e) => setCampaignId(e.target.value);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notification Campaign Metrics</h1>
      <p className="text-gray-600 max-w-2xl">
        Select a campaign to view deliverability and engagement statistics. These
        metrics can help you understand how your communications are being
        received and fine‑tune future campaigns.
      </p>
      <Card className="space-y-4">
        <div className="flex flex-col max-w-sm">
          <label htmlFor="campaign">Campaign</label>
          <Select id="campaign" value={campaignId} onChange={handleChange}>
            <option value="">Select campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {isLoading && campaignId && <LoadingSpinner />}
        {metrics && (
          <Table className="mt-4">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Count</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sent</td>
                <td>{metrics.sent}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Delivered</td>
                <td>{metrics.delivered}</td>
                <td>
                  {metrics.sent > 0
                    ? `${((metrics.delivered / metrics.sent) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td>Opened</td>
                <td>{metrics.opened}</td>
                <td>
                  {metrics.delivered > 0
                    ? `${((metrics.opened / metrics.delivered) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td>Clicked</td>
                <td>{metrics.clicked}</td>
                <td>
                  {metrics.delivered > 0
                    ? `${((metrics.clicked / metrics.delivered) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td>Bounces</td>
                <td>{metrics.bounces}</td>
                <td>
                  {metrics.sent > 0
                    ? `${((metrics.bounces / metrics.sent) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td>Unsubscribed</td>
                <td>{metrics.unsubscribed}</td>
                <td>
                  {metrics.delivered > 0
                    ? `${((metrics.unsubscribed / metrics.delivered) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

