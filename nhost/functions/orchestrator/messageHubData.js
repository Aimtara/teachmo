import { hasuraRequest } from './hasura.js';

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

/**
 * Fetch up to N recent threads for the given user and include other participant user_ids.
 * Works even when called with admin secret because the filter is explicit.
 */
export async function fetchRecentThreadsForUser({ userId, limit = 10 }) {
  const data = await hasuraRequest({
    query: `query RecentThreadsForUser($userId: uuid!, $limit: Int!) {
      message_threads(
        where: { participants: { user_id: { _eq: $userId } } }
        order_by: { updated_at: desc }
        limit: $limit
      ) {
        id
        title
        last_message_preview
        updated_at
        participants(where: { user_id: { _neq: $userId } }) {
          user_id
        }
      }
    }`,
    variables: { userId, limit }
  });

  const threads = data?.message_threads || [];
  const otherIds = uniq(threads.flatMap((t) => (t.participants || []).map((p) => p.user_id)));
  return { threads, otherUserIds: otherIds };
}

/**
 * Fetch a minimal display label for auth.users.
 * Note: auth.users is tracked in Hasura metadata, but columns may vary by Nhost version.
 */
export async function fetchUserLabels({ userIds }) {
  const ids = uniq(userIds);
  if (ids.length === 0) return new Map();

  const data = await hasuraRequest({
    query: `query UserLabels($ids: [uuid!]!) {
      users(where: { id: { _in: $ids } }) {
        id
        display_name
        email
      }
    }`,
    variables: { ids }
  });

  const map = new Map();
  for (const u of data?.users || []) {
    const label = clean(u.display_name) || clean(u.email) || `User ${String(u.id).slice(0, 6)}`;
    map.set(u.id, label);
  }
  return map;
}
