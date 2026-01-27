/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireFeatureFlag } from '../middleware/featureFlags.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('ai-explainability');

router.use(requireAuth);
router.use(requireTenant);
router.use(requireFeatureFlag('AI_ASSISTANT'));

router.get('/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { id } = req.params;

  try {
    const result = await query(
      `select i.id,
              i.organization_id,
              i.model,
              i.token_prompt,
              i.token_response,
              i.token_total,
              i.cost_usd,
              i.safety_risk_score,
              i.safety_flags,
              i.created_at,
              i.metadata,
              q.status as review_status,
              q.reason as review_reason,
              q.reviewed_at,
              ra.notes as review_notes
       from ai_interactions i
       left join ai_review_queue q on q.interaction_id = i.id
       left join lateral (
         select notes
         from ai_review_actions
         where queue_id = q.id
         order by created_at desc
         limit 1
       ) ra on true
       where i.id = $1
         and i.organization_id = $2
         and (i.school_id is null or i.school_id = $3)`,
      [id, organizationId, schoolId || null]
    );

    const row = result.rows?.[0];
    if (!row) {
      return res.status(404).json({ error: 'not_found' });
    }

    const promptTokens = Number(row.token_prompt || 0);
    const completionTokens = Number(row.token_response || 0);

    const summary = {
      id: row.id,
      model: row.model,
      promptTokens: row.token_prompt,
      completionTokens: row.token_response,
      totalTokens: row.token_total ?? promptTokens + completionTokens,
      costUsd: row.cost_usd,
      riskScore: row.safety_risk_score,
      flags: row.safety_flags,
      createdAt: row.created_at,
      metadata: row.metadata,
      review: row.review_status
        ? {
            status: row.review_status,
            reason: row.review_reason,
            notes: row.review_notes,
            reviewedAt: row.reviewed_at,
          }
        : null,
    };

    return res.json({ summary });
  } catch (error) {
    logger.error('Failed to fetch AI interaction explainability', error);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
