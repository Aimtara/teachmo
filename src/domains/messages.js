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
