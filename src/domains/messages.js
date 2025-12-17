import { graphql } from '@/lib/graphql';
import { retentionCutoffDate } from '@/security/retention';

export async function listMessageThreads(params = {}) {
  const query = `
    query ListThreads($limit: Int, $offset: Int) {
      message_threads(limit: $limit, offset: $offset, order_by: { updated_at: desc }) {
        id
        title
        updated_at
        created_at
        last_message_preview
      }
    }
  `;

  const variables = {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  };

  const data = await graphql(query, variables);
  return data?.message_threads ?? [];
}

export async function listMessages(threadId, params = {}) {
  const cutoff = retentionCutoffDate();

  const query = `
    query ListMessages($threadId: uuid!, $limit: Int, $offset: Int, $cutoff: timestamptz!) {
      messages(
        limit: $limit,
        offset: $offset,
        where: {
          thread_id: { _eq: $threadId },
          created_at: { _gte: $cutoff }
        },
        order_by: { created_at: asc }
      ) {
        id
        thread_id
        sender_id
        body
        created_at
      }
    }
  `;

  const variables = {
    threadId,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
    cutoff: cutoff.toISOString(),
  };

  const data = await graphql(query, variables);
  return data?.messages ?? [];
}

export async function sendMessage({ threadId, senderId, body }) {
  const mutation = `
    mutation SendMessage($object: messages_insert_input!) {
      insert_messages_one(object: $object) {
        id
        thread_id
        sender_id
        created_at
      }
    }
  `;

  const object = {
    thread_id: threadId,
    sender_id: senderId,
    body,
  };

  const data = await graphql(mutation, { object });
  return data?.insert_messages_one ?? null;
}

export async function moderateMessageHide({ messageId, moderatorId, reason }) {
  const mutation = `
    mutation HideMessage($id: uuid!, $moderatorId: uuid!, $reason: String) {
      update_messages_by_pk(
        pk_columns: { id: $id },
        _set: {
          is_hidden: true,
          hidden_by: $moderatorId,
          hidden_reason: $reason
        }
      ) {
        id
        thread_id
        is_hidden
      }
    }
  `;
  const data = await graphql(mutation, { id: messageId, moderatorId, reason: reason ?? null });
  return data?.update_messages_by_pk ?? null;
}

export async function moderateMessageRedact({ messageId, moderatorId, reason }) {
  const mutation = `
    mutation RedactMessage($id: uuid!, $moderatorId: uuid!, $reason: String) {
      update_messages_by_pk(
        pk_columns: { id: $id },
        _set: {
          is_redacted: true,
          body: "[redacted]",
          redacted_by: $moderatorId,
          redacted_reason: $reason
        }
      ) {
        id
        thread_id
        is_redacted
      }
    }
  `;
  const data = await graphql(mutation, { id: messageId, moderatorId, reason: reason ?? null });
  return data?.update_messages_by_pk ?? null;
}

export async function moderateMessageDelete({ messageId, moderatorId, reason }) {
  const mutation = `
    mutation DeleteMessage($id: uuid!, $moderatorId: uuid!, $reason: String) {
      update_messages_by_pk(
        pk_columns: { id: $id },
        _set: {
          is_deleted: true,
          body: "[deleted]",
          deleted_by: $moderatorId,
          deleted_reason: $reason
        }
      ) {
        id
        thread_id
        is_deleted
      }
    }
  `;
  const data = await graphql(mutation, { id: messageId, moderatorId, reason: reason ?? null });
  return data?.update_messages_by_pk ?? null;
}
