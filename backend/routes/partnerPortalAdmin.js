/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);
router.use(requireScopes('partner:admin'));

const logAudit = async ({ organizationId, submissionId, action, actorId, reason }) => {
  if (!submissionId) return;
  await query(
    `insert into partner_submission_audits (organization_id, submission_id, actor_id, action, reason)
     values ($1,$2,$3,$4,$5)`,
    [organizationId, submissionId, actorId || null, action, reason || null]
  );
};

router.get('/audits', async (req, res) => {
  const { organizationId } = req.tenant;
  const r = await query(
    `select id, submission_id, actor_id, action, reason, created_at
     from partner_submission_audits
     where organization_id = $1
     order by created_at desc
     limit 200`,
    [organizationId]
  );
  res.json(r.rows || []);
});

router.get('/audit-logs', async (req, res) => {
  const { organizationId } = req.tenant;
  const r = await query(
    `select id, submission_id, actor_id, action, reason, created_at
     from partner_submission_audits
     where organization_id = $1
     order by created_at desc
     limit 200`,
    [organizationId]
  );
  res.json(r.rows || []);
});

router.get('/metrics', async (req, res) => {
  const { organizationId } = req.tenant;

  const [activeParents, recentMessages, workflowRuns, latencyAvg] = await Promise.all([
    query(
      `select count(distinct actor_id) as count
       from analytics_events
       where organization_id = $1
         and actor_role = 'parent'
         and event_ts >= now() - interval '7 days'`,
      [organizationId]
    ),
    query(
      `select count(*) as count
       from analytics_events
       where organization_id = $1
         and event_name = 'message_sent'
         and event_ts >= now() - interval '24 hours'`,
      [organizationId]
    ),
    query(
      `select count(*) as count
       from workflow_runs
       where organization_id = $1`,
      [organizationId]
    ),
    query(
      `select avg(latency_ms) as avg_latency
       from ai_interactions
       where organization_id = $1`,
      [organizationId]
    )
  ]);

  res.json({
    active_parents: Number(activeParents.rows?.[0]?.count || 0),
    messages_sent: Number(recentMessages.rows?.[0]?.count || 0),
    workflows_run: Number(workflowRuns.rows?.[0]?.count || 0),
    ai_latency: Math.round(Number(latencyAvg.rows?.[0]?.avg_latency || 0))
  });
});

router.patch('/submissions/:id', async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { status, reason } = req.body || {};
  const r = await query(
    `update partner_submissions
     set status = $3, reason = $4, updated_at = now()
     where id = $1 and organization_id = $2
     returning id, partner_id, type, title, description, status, reason, created_at, updated_at`,
    [id, organizationId, status, reason || null]
  );
  if (!r.rows?.length) return res.status(404).json({ error: 'not found' });
  await logAudit({ organizationId, submissionId: id, action: status, actorId: req.auth?.userId, reason });
  res.json(r.rows[0]);
});

router.patch('/incentive-applications/:id', async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { status, payout } = req.body || {};
  const r = await query(
    `update partner_incentive_applications
     set status = coalesce($3, status), payout = coalesce($4, payout), updated_at = now()
     where id = $1 and organization_id = $2
     returning id, incentive_id, partner_id, status, payout, created_at, updated_at`,
    [id, organizationId, status || null, payout || null]
  );
  if (!r.rows?.length) return res.status(404).json({ error: 'not found' });
  await logAudit({ organizationId, submissionId: null, action: status || 'update', actorId: req.auth?.userId });
  res.json(r.rows[0]);
});

router.patch('/contracts/:id', async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { status } = req.body || {};
  const r = await query(
    `update partner_contracts
     set status = $3, updated_at = now()
     where id = $1 and organization_id = $2
     returning id, partner_id, title, description, status, signed_at, created_at, updated_at`,
    [id, organizationId, status]
  );
  if (!r.rows?.length) return res.status(404).json({ error: 'not found' });
  await logAudit({ organizationId, submissionId: null, action: status || 'update', actorId: req.auth?.userId });
  res.json(r.rows[0]);
});

router.post('/onboarding-tasks', async (req, res) => {
  const { organizationId } = req.tenant;
  const { name, description, title } = req.body || {};
  const resolvedTitle = title || name;
  if (!resolvedTitle) return res.status(400).json({ error: 'name required' });
  const r = await query(
    `insert into partner_onboarding_tasks (organization_id, title, description)
     values ($1,$2,$3)
     returning id, title, description, created_at, updated_at`,
    [organizationId, resolvedTitle, description || null]
  );
  res.status(201).json(r.rows?.[0]);
});

router.post('/courses', async (req, res) => {
  const { organizationId } = req.tenant;
  const { title, description, modules } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  const r = await query(
    `insert into partner_courses (organization_id, title, description)
     values ($1,$2,$3)
     returning id, title, description`,
    [organizationId, title, description || null]
  );

  const course = r.rows?.[0];
  if (Array.isArray(modules) && course?.id) {
    for (const [idx, mod] of modules.entries()) {
      await query(
        `insert into partner_course_modules (course_id, title, content, module_order)
         values ($1,$2,$3,$4)`,
        [course.id, mod.title, mod.content || null, idx]
      );
    }
  }
  res.status(201).json({ course });
});

export default router;
