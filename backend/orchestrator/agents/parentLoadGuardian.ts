// backend/orchestrator/agents/parentLoadGuardian.ts

interface ParentLoadContext {
  parentId: string;
  tenantId: string;
  messageSeverity: 'routine' | 'important' | 'urgent';
}

export async function arbitrateParentLoad(
  context: ParentLoadContext, 
  db: any
): Promise<'dispatch_now' | 'route_to_digest'> {
  
  // 1. Safety Override: Urgent messages bypass load checks
  if (context.messageSeverity === 'urgent') {
    return 'dispatch_now';
  }

  // 2. Fetch current load budget metrics for the rolling 24h window
  const recentMessagesCount = await db.query(
    `SELECT count(*) FROM public_notification_outbox 
     WHERE parent_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [context.parentId]
  );

  // 3. Fetch tenant or parent specific threshold (e.g., max 3 routine messages/day)
  const loadBudget = await db.query(
    `SELECT daily_message_limit FROM public_notification_preferences WHERE parent_id = $1`,
    [context.parentId]
  );

  const limit = loadBudget.daily_message_limit || 3; // Default limit

  // 4. Inhibit Early: If over budget, suppress immediate delivery
  if (recentMessagesCount >= limit) {
    console.log(`[Load Guardian] Parent ${context.parentId} exceeded load budget. Routing to digest.`);
    return 'route_to_digest';
  }

  return 'dispatch_now';
}
