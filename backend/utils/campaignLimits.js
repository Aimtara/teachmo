import { query } from '../db.js';

const CAMPAIGN_LIMITS = {
  fundraising: {
    window_days: 7,
    max_count: 2,
    error: 'Equity Guardrail: Fundraising messages are limited to 2 per week per family.',
  },
  general: {
    window_days: 1,
    max_count: 1,
    error: 'Cognitive Load Protection: Max 1 general announcement per day.',
  },
};

/**
 * Checks if a proposed campaign violates equity/load guardrails.
 * @param {string} tenantId
 * @param {string} category
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function checkCampaignLimits(tenantId, category) {
  const normalizedCategory = (category || '').toString().trim().toLowerCase();
  if (!tenantId || normalizedCategory === 'emergency') {
    return { allowed: true };
  }

  const limitRule = CAMPAIGN_LIMITS[normalizedCategory];
  if (!limitRule) return { allowed: true };

  const result = await query(
    `SELECT count(*) as count
     FROM public.notification_messages
     WHERE (organization_id = $1 OR school_id = $1)
       AND category = $2
       AND created_at > NOW() - ($3 || ' days')::INTERVAL
       AND status NOT IN ('cancelled', 'failed')`,
    [tenantId, normalizedCategory, limitRule.window_days],
  );

  const count = Number.parseInt(result.rows[0]?.count || '0', 10);
  if (count >= limitRule.max_count) {
    return {
      allowed: false,
      reason: `${limitRule.error} (Current: ${count} in last ${limitRule.window_days} days)`,
    };
  }

  return { allowed: true };
}
