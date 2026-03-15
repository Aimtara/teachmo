/* eslint-env node */

// Default per-user daily message limit. The notification_preferences schema does not
// currently include a daily_message_limit column; update this constant or extend
// the schema if per-user limits are needed in the future.
const DEFAULT_DAILY_LIMIT = 3;

/**
 * @param {{ parentId: string, messageSeverity: 'routine'|'important'|'urgent' }} context
 * @param {{ query: (sql:string, params:any[]) => Promise<any> }} db
 */
export async function arbitrateParentLoad(context, db) {
  if (context?.messageSeverity === 'urgent') {
    return 'dispatch_now';
  }

  const recentMessagesResult = await db.query(
    `SELECT count(*)::int AS count
     FROM public.notification_outbox
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'`,
    [context.parentId]
  );
  const recentCount = Number(recentMessagesResult?.rows?.[0]?.count || 0);

  const limit = DEFAULT_DAILY_LIMIT;

  return recentCount >= limit ? 'route_to_digest' : 'dispatch_now';
}
