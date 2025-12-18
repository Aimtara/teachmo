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
