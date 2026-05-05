import { graphqlRequest } from '@/lib/graphql';
import { domainJson, type ApiHeaders } from '@/domains/http';

export function listNotificationCampaigns() {
  return graphqlRequest({
    query: `query NotificationCampaigns {
      notification_campaigns(order_by: {created_at: desc}) {
        id
        name
      }
    }`,
  }).then((res) => res?.notification_campaigns ?? []);
}

export function getNotificationCampaignMetrics(campaignId) {
  return graphqlRequest({
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
  }).then((res) => res?.notification_campaign_metrics_by_pk ?? null);
}

export function listNotificationOptOuts() {
  return graphqlRequest({
    query: `query OptOuts {
      notification_opt_outs(order_by: {created_at: desc}) {
        email
        phone
        created_at
      }
    }`,
  });
}

export function removeNotificationOptOut({ email, phone }) {
  return graphqlRequest({
    query: `mutation RemoveOptOut($email: String, $phone: String) {
      delete_notification_opt_outs(where: { _or: [{email: {_eq: $email}}, {phone: {_eq: $phone}}] }) {
        affected_rows
      }
    }`,
    variables: { email, phone },
  });
}

export function listAdminAnnouncements(headers?: ApiHeaders) {
  return domainJson('/admin/notifications/announcements', { headers });
}

export function getAdminNotificationMetrics(channel: string, headers?: ApiHeaders) {
  return domainJson(`/admin/notifications/metrics?channel=${encodeURIComponent(channel)}`, { headers });
}

export function getTenantNotificationSettings(headers?: ApiHeaders) {
  return domainJson('/tenants/settings', { headers });
}

export function createAdminAnnouncement(payload, headers?: ApiHeaders) {
  return domainJson('/admin/notifications/announcements', {
    method: 'POST',
    headers,
    json: payload,
  });
}

export function updateTenantNotificationSettings(payload, headers?: ApiHeaders) {
  return domainJson('/tenants/settings', {
    method: 'PUT',
    headers,
    json: payload,
  });
}
