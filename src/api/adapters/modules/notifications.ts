import { graphql } from '@/lib/graphql';

const NOTIFICATION_FIELDS = `
  id
  type
  severity
  title
  body
  entity_type
  entity_id
  created_at
  read_at
  metadata
`;

const PREFERENCE_FIELDS = `
  user_id
  email_enabled
  in_app_enabled
  directory_alerts
  digest_mode
  quiet_hours_start
  quiet_hours_end
  timezone
  digest_hour
  invites_alerts
  messaging_alerts
  directory_digest
  invites_digest
  messaging_digest
`;

type NotificationPreferenceRecord = {
  user_id: string;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  directory_alerts?: boolean;
  digest_mode?: string;
  quiet_hours_start?: number | null;
  quiet_hours_end?: number | null;
  timezone?: string | null;
  digest_hour?: number | null;
  invites_alerts?: boolean;
  messaging_alerts?: boolean;
  directory_digest?: boolean;
  invites_digest?: boolean;
  messaging_digest?: boolean;
};

type NotificationPreferenceInput = Omit<NotificationPreferenceRecord, 'user_id'>;

export async function listNotifications(params: { limit?: number; unreadOnly?: boolean } = {}) {
  const limit = Math.max(1, Math.min(100, Number(params.limit ?? 50) || 50));
  const where = params.unreadOnly ? { read_at: { _is_null: true } } : {};

  const data = await graphql(
    `query Notifications($limit: Int!, $where: notifications_bool_exp) {
      notifications(where: $where, order_by: { created_at: desc }, limit: $limit) { ${NOTIFICATION_FIELDS} }
    }`,
    { limit, where }
  );

  return data?.notifications ?? [];
}

export async function markAsRead(id: string) {
  const timestamp = new Date().toISOString();
  const data = await graphql(
    `mutation MarkNotification($id: uuid!, $timestamp: timestamptz!) {
      update_notifications_by_pk(pk_columns: { id: $id }, _set: { read_at: $timestamp }) {
        id
        read_at
      }
    }`,
    { id, timestamp }
  );

  return data?.update_notifications_by_pk;
}

export async function getUnreadCount() {
  const data = await graphql(
    `query UnreadNotificationCount {
      notifications_aggregate(where: { read_at: { _is_null: true } }) {
        aggregate { count }
      }
    }`
  );

  return Number(data?.notifications_aggregate?.aggregate?.count ?? 0);
}

export async function getPreferences(userId?: string): Promise<NotificationPreferenceRecord | null> {
  if (userId) {
    const data = await graphql(
      `query NotificationPreferences($userId: uuid!) {
        notification_preferences_by_pk(user_id: $userId) { ${PREFERENCE_FIELDS} }
      }`,
      { userId }
    );

    return data?.notification_preferences_by_pk ?? null;
  }

  const data = await graphql(
    `query NotificationPreferencesFallback {
      notification_preferences(limit: 1) { ${PREFERENCE_FIELDS} }
    }`
  );

  return Array.isArray(data?.notification_preferences) ? data.notification_preferences[0] ?? null : null;
}

export async function savePreferences(userId: string, input: NotificationPreferenceInput) {
  if (!userId) throw new Error('userId is required to save notification preferences');

  const object = { ...input, user_id: userId };
  const data = await graphql(
    `mutation SaveNotificationPreferences($object: notification_preferences_insert_input!) {
      insert_notification_preferences_one(
        object: $object,
        on_conflict: {
          constraint: notification_preferences_pkey,
          update_columns: [
            email_enabled,
            in_app_enabled,
            directory_alerts,
            digest_mode,
            quiet_hours_start,
            quiet_hours_end,
            timezone,
            digest_hour,
            invites_alerts,
            messaging_alerts,
            directory_digest,
            invites_digest,
            messaging_digest
          ]
        }
      ) { ${PREFERENCE_FIELDS} }
    }`,
    { object }
  );

  return data?.insert_notification_preferences_one;
}
