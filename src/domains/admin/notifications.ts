import { graphqlRequest } from '@/lib/graphql';

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
