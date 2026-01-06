/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  buildReportPayload,
  evaluateAlertRules,
  getNextRunAt,
  loadObservabilitySummary,
  parseRange,
} from '../utils/observability.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);

router.get('/observability/summary', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { start, end } = parseRange({ start: req.query.start, end: req.query.end });
  const summary = await loadObservabilitySummary({ organizationId, schoolId, start, end });

  res.json({ range: { start, end }, ...summary });
});

router.get('/observability/alerts', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const rules = await query(
    `select *
     from alert_rules
     where organization_id = $1
       and (school_id is null or school_id = $2)
     order by created_at desc`,
    [organizationId, schoolId || null]
  );
  const events = await query(
    `select *
     from alert_events
     where organization_id = $1
       and (school_id is null or school_id = $2)
     order by triggered_at desc
     limit 50`,
    [organizationId, schoolId || null]
  );
  res.json({ rules: rules.rows || [], events: events.rows || [] });
});

router.post('/observability/alerts', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const {
    name,
    metricKey,
    comparison,
    threshold,
    windowMinutes,
    anomaly,
    anomalyFactor,
    channel,
    segment,
    cooldownMinutes
  } = req.body || {};

  if (!name || !metricKey) {
    return res.status(400).json({ error: 'name and metricKey are required' });
  }

  const result = await query(
    `insert into alert_rules
      (organization_id, school_id, name, metric_key, comparison, threshold, window_minutes, anomaly, anomaly_factor, channel, segment, cooldown_minutes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
     returning *`,
    [
      organizationId,
      schoolId || null,
      name,
      metricKey,
      comparison || 'gt',
      threshold ?? null,
      windowMinutes || 60,
      Boolean(anomaly),
      anomalyFactor ?? null,
      channel || 'email',
      JSON.stringify(segment || {}),
      cooldownMinutes || 60
    ]
  );
  res.status(201).json({ rule: result.rows?.[0] });
});

router.patch('/observability/alerts/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { enabled, name, threshold, comparison, windowMinutes, anomaly, anomalyFactor, channel, segment, cooldownMinutes } = req.body || {};
  const result = await query(
    `update alert_rules
     set enabled = coalesce($4, enabled),
         name = coalesce($5, name),
         threshold = coalesce($6, threshold),
         comparison = coalesce($7, comparison),
         window_minutes = coalesce($8, window_minutes),
         anomaly = coalesce($9, anomaly),
         anomaly_factor = coalesce($10, anomaly_factor),
         channel = coalesce($11, channel),
         segment = coalesce($12::jsonb, segment),
         cooldown_minutes = coalesce($13, cooldown_minutes),
         updated_at = now()
     where id = $1
       and organization_id = $2
       and (school_id is null or school_id = $3)
     returning *`,
    [
      req.params.id,
      organizationId,
      schoolId || null,
      enabled ?? null,
      name ?? null,
      threshold ?? null,
      comparison ?? null,
      windowMinutes ?? null,
      anomaly ?? null,
      anomalyFactor ?? null,
      channel ?? null,
      segment ? JSON.stringify(segment) : null,
      cooldownMinutes ?? null
    ]
  );
  if (!result.rows?.[0]) return res.status(404).json({ error: 'not found' });
  res.json({ rule: result.rows[0] });
});

router.post('/observability/alerts/run', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const triggered = await evaluateAlertRules({ organizationId, schoolId });
  res.json({ triggered: triggered.length });
});

router.get('/observability/reports', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const reports = await query(
    `select *
     from scheduled_reports
     where organization_id = $1
       and (school_id is null or school_id = $2)
     order by created_at desc`,
    [organizationId, schoolId || null]
  );
  const runs = await query(
    `select *
     from scheduled_report_runs
     where organization_id = $1
       and (school_id is null or school_id = $2)
     order by run_at desc
     limit 50`,
    [organizationId, schoolId || null]
  );
  res.json({ reports: reports.rows || [], runs: runs.rows || [] });
});

router.post('/observability/reports', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { name, reportType, frequency, channel, segment } = req.body || {};
  if (!name || !reportType || !frequency) {
    return res.status(400).json({ error: 'name, reportType, frequency required' });
  }
  const nextRunAt = getNextRunAt({ frequency });
  const result = await query(
    `insert into scheduled_reports
      (organization_id, school_id, name, report_type, frequency, channel, segment, next_run_at)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     returning *`,
    [organizationId, schoolId || null, name, reportType, frequency, channel || 'email', JSON.stringify(segment || {}), nextRunAt]
  );
  res.status(201).json({ report: result.rows?.[0] });
});

router.patch('/observability/reports/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { enabled, name, frequency, channel, segment } = req.body || {};
  const result = await query(
    `update scheduled_reports
     set enabled = coalesce($4, enabled),
         name = coalesce($5, name),
         frequency = coalesce($6, frequency),
         channel = coalesce($7, channel),
         segment = coalesce($8::jsonb, segment),
         updated_at = now()
     where id = $1
       and organization_id = $2
       and (school_id is null or school_id = $3)
     returning *`,
    [
      req.params.id,
      organizationId,
      schoolId || null,
      enabled ?? null,
      name ?? null,
      frequency ?? null,
      channel ?? null,
      segment ? JSON.stringify(segment) : null
    ]
  );
  if (!result.rows?.[0]) return res.status(404).json({ error: 'not found' });
  res.json({ report: result.rows[0] });
});

router.get('/system/health', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  let dbStatus = 'ok';
  try {
    await query('select 1');
  } catch (err) {
    dbStatus = 'error';
  }

  const queue = await query(
    `select
        sum(case when status = 'pending' then 1 else 0 end) as pending,
        sum(case when status = 'dead' then 1 else 0 end) as dead
     from public.notification_queue q
     join public.notification_messages m on m.id = q.message_id
     where m.organization_id = $1
       and (m.school_id is null or m.school_id = $2)`,
    [organizationId, schoolId || null]
  );

  res.json({
    services: [
      { name: 'API', status: 'ok' },
      { name: 'Database', status: dbStatus }
    ],
    dependencies: [
      {
        name: 'Notifications Queue',
        status: dbStatus === 'ok' ? 'ok' : 'degraded',
        pending: Number(queue.rows?.[0]?.pending || 0),
        dead: Number(queue.rows?.[0]?.dead || 0)
      }
    ]
  });
});

router.get('/observability/reports/:id/preview', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const report = await query(
    `select *
     from scheduled_reports
     where id = $1
       and organization_id = $2
       and (school_id is null or school_id = $3)`,
    [req.params.id, organizationId, schoolId || null]
  );
  if (!report.rows?.[0]) return res.status(404).json({ error: 'not found' });
  const payload = await buildReportPayload({
    organizationId,
    schoolId,
    reportType: report.rows[0].report_type,
    frequency: report.rows[0].frequency
  });
  res.json({ payload });
});

export default router;
