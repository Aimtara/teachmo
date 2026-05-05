import { graphql } from '@/lib/graphql';

export type ObservabilityAlertSettings = {
  email?: string | null;
  slack_webhook?: string | null;
  pagerduty_key?: string | null;
};

export async function getObservabilityAlertSettings() {
  const data = await graphql(`
    query AlertSettings {
      observability_alert_settings(limit: 1) {
        email
        slack_webhook
        pagerduty_key
      }
    }
  `);
  return data?.observability_alert_settings?.[0] ?? null;
}

export async function saveObservabilityAlertSettings({
  email,
  slackWebhook,
  pagerDutyKey,
}: {
  email?: string | null;
  slackWebhook?: string | null;
  pagerDutyKey?: string | null;
}) {
  return graphql(
    `mutation UpsertAlertSettings($email: String, $slack: String, $pd: String) {
      insert_observability_alert_settings_one(
        object: { email: $email, slack_webhook: $slack, pagerduty_key: $pd },
        on_conflict: {
          constraint: observability_alert_settings_pkey,
          update_columns: [email, slack_webhook, pagerduty_key]
        }
      ) { email }
    }`,
    { email: email || null, slack: slackWebhook || null, pd: pagerDutyKey || null },
  );
}

export async function sendObservabilityTestAlert() {
  return graphql('mutation { send_test_alert { message } }');
}
