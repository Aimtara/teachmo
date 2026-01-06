/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';
import { getTenantScope } from '../utils/tenantScope.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/tasks', requireScopes(['partner:portal', 'partner:admin'], { any: true }), async (req, res) => {
  const { organizationId } = req.tenant;
  const r = await query(
    `select id, title, description, created_at, updated_at
     from partner_onboarding_tasks
     where organization_id = $1
     order by created_at asc`,
    [organizationId]
  );
  res.json(r.rows || []);
});

router.post('/tasks', requireAdmin, requireScopes('partner:admin'), async (req, res) => {
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

router.get('/progress/me', requireScopes('partner:portal'), async (req, res) => {
  const { organizationId } = req.tenant;
  const partnerId = req.auth?.userId || null;

  const tasksRes = await query(
    `select id, title, description from partner_onboarding_tasks where organization_id = $1`,
    [organizationId]
  );

  const progressRes = await query(
    `select task_id, status from partner_onboarding_progress
     where organization_id = $1 and partner_id = $2`,
    [organizationId, partnerId]
  );

  const progressMap = new Map(progressRes.rows.map((row) => [row.task_id, row.status]));
  const payload = tasksRes.rows.map((task) => ({
    ...task,
    completed: progressMap.get(task.id) === 'completed',
  }));

  res.json(payload);
});

router.post('/progress/:taskId', requireScopes('partner:portal'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { taskId } = req.params;
  const partnerId = req.auth?.userId || null;

  const r = await query(
    `insert into partner_onboarding_progress (organization_id, partner_id, task_id, status, completed_at)
     values ($1,$2,$3,'completed', now())
     on conflict (partner_id, task_id) do update
       set status = 'completed', completed_at = now(), updated_at = now()
     returning id, task_id, status, completed_at`,
    [organizationId, partnerId, taskId]
  );

  res.json(r.rows?.[0]);
});

router.get('/status/me', requireScopes('partner:portal'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { districtId, userId } = getTenantScope(req);
  const partnerId = userId;
  const effectiveDistrictId = districtId || organizationId;

  const [tasksRes, progressRes, profileRes, agreementRes, payoutRes] = await Promise.all([
    query(
      `select id, title, description from partner_onboarding_tasks where organization_id = $1`,
      [organizationId]
    ),
    query(
      `select task_id, status from partner_onboarding_progress
       where organization_id = $1 and partner_id = $2`,
      [organizationId, partnerId]
    ),
    query(
      `select id, status from public.partner_profiles
       where district_id = $1 and partner_user_id = $2`,
      [effectiveDistrictId, partnerId]
    ),
    query(
      `select id, status from public.partner_agreements
       where district_id = $1 and partner_user_id = $2
       order by created_at desc
       limit 1`,
      [effectiveDistrictId, partnerId]
    ),
    query(
      `select id, status from public.partner_payout_settings
       where district_id = $1 and partner_user_id = $2`,
      [effectiveDistrictId, partnerId]
    )
  ]);

  const progressMap = new Map(progressRes.rows.map((row) => [row.task_id, row.status]));
  const tasks = tasksRes.rows.map((task) => ({
    ...task,
    completed: progressMap.get(task.id) === 'completed',
  }));

  const profile = profileRes.rows?.[0] || null;
  const agreement = agreementRes.rows?.[0] || null;
  const payout = payoutRes.rows?.[0] || null;

  const steps = [
    { key: 'profile', status: profile?.status || 'missing', completed: Boolean(profile) },
    { key: 'agreement', status: agreement?.status || 'missing', completed: agreement?.status === 'signed' },
    { key: 'payout', status: payout?.status || 'missing', completed: payout?.status === 'active' },
    { key: 'tasks', completed: tasks.every((task) => task.completed) },
  ];

  res.json({
    partnerId,
    tasks,
    profile,
    agreement,
    payout,
    steps,
  });
});

export default router;
