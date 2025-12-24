/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.post('/log', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const {
    prompt,
    response,
    tokenPrompt,
    tokenResponse,
    tokenTotal,
    safetyRiskScore,
    safetyFlags,
    model,
    metadata,
    childId
  } = req.body || {};

  if (!prompt || !response) return res.status(400).json({ error: 'missing prompt/response' });

  const r = await query(
    `insert into ai_interactions
      (organization_id, school_id, actor_id, actor_role, child_id, prompt, response, token_prompt, token_response, token_total, safety_risk_score, safety_flags, model, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb)
     returning id`,
    [
      organizationId,
      schoolId || null,
      req.auth?.userId || null,
      req.auth?.role || null,
      childId || null,
      prompt,
      response,
      tokenPrompt || null,
      tokenResponse || null,
      tokenTotal || null,
      safetyRiskScore ?? null,
      JSON.stringify(safetyFlags || []),
      model || null,
      JSON.stringify(metadata || {})
    ]
  );

  res.status(201).json({ id: r.rows?.[0]?.id });
});

export default router;
