import { query } from '../db.js';

type CampaignCategory = 'fundraising' | 'general' | 'emergency' | string;

type CampaignLimit = {
  maxPerWeek: number;
  error: string;
};

const LIMITS: Record<string, CampaignLimit> = {
  fundraising: {
    maxPerWeek: 2,
    error: 'Equity Guardrail: Fundraising campaigns limited to 2 per week.'
  },
  general: {
    maxPerWeek: 5,
    error: 'Volume Control: General announcements limited to 5 per week.'
  }
};

type CampaignLimitAllowedResult = {
  allowed: true;
};

type CampaignLimitBlockedResult = {
  allowed: false;
  reason: string;
  currentCount: number;
};

export async function checkCampaignLimits(
  tenantId: string,
  category: CampaignCategory
): Promise<CampaignLimitAllowedResult | CampaignLimitBlockedResult> {
  if (category === 'emergency') return { allowed: true };

  const limit = LIMITS[category] || LIMITS.general;

  const result = await query(
    `SELECT count(*) as count
     FROM public.notification_messages
     WHERE (organization_id = $1 OR school_id = $1)
       AND category = $2
       AND created_at > NOW() - INTERVAL '7 days'`,
    [tenantId, category]
  );

  const count = parseInt(String(result.rows[0]?.count ?? 0), 10);

  if (count >= limit.maxPerWeek) {
    return {
      allowed: false,
      reason: limit.error,
      currentCount: count
    };
  }

  return { allowed: true };
}
