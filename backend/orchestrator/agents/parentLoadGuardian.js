/* eslint-env node */

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

  const budgetResult = await db.query(
    `SELECT daily_message_limit
     FROM public.notification_preferences
     WHERE user_id = $1
     LIMIT 1`,
    [context.parentId]
  );
  const limit = Number(budgetResult?.rows?.[0]?.daily_message_limit || 3);

  return recentCount >= limit ? 'route_to_digest' : 'dispatch_now';
}
