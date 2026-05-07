// backend/orchestrator/agents/parentLoadGuardian.ts

interface ParentLoadContext {
  parentId: string;
  tenantId: string;
  messageSeverity: 'routine' | 'important' | 'urgent';
}

interface QueryableParentLoadDb {
  query: (sql: string, params: readonly unknown[]) => Promise<unknown>;
}

function firstRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const rows = (value as { rows?: unknown }).rows;
  if (Array.isArray(rows) && rows[0] && typeof rows[0] === 'object') {
    return rows[0] as Record<string, unknown>;
  }
  return null;
}

function numericValue(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function queryNumber(value: unknown, key: string, fallback = 0): number {
  if (typeof value === 'number' || typeof value === 'string') return numericValue(value, fallback);
  if (value && typeof value === 'object' && key in value) {
    return numericValue((value as Record<string, unknown>)[key], fallback);
  }
  return numericValue(firstRow(value)?.[key], fallback);
}

export async function arbitrateParentLoad(
  context: ParentLoadContext, 
  db: QueryableParentLoadDb
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

  const recentMessages = queryNumber(recentMessagesCount, 'count', 0);
  const limit = queryNumber(loadBudget, 'daily_message_limit', 3); // Default limit

  // 4. Inhibit Early: If over budget, suppress immediate delivery
  if (recentMessages >= limit) {
    console.log(`[Load Guardian] Parent ${context.parentId} exceeded load budget. Routing to digest.`);
    return 'route_to_digest';
  }

  return 'dispatch_now';
}
