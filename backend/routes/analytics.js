/* eslint-env node */
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireAnyScope } from '../middleware/permissions.js';
import { asUuidOrNull, getTenantScope } from '../utils/tenantScope.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

function parseTimeRange(req) {
  const end = req.query.end ? new Date(String(req.query.end)) : new Date();
  const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function roleFilter(req) {
  const role = req.query.role ? String(req.query.role) : null;
  return role === 'all' ? null : role;
}

async function summaryMetrics({ organizationId, schoolId, start, end, role, childId }) {
  const params = [organizationId, start.toISOString(), end.toISOString()];
  let where = 'organization_id = $1 AND event_ts >= $2 AND event_ts <= $3';
  let idx = 4;

  if (schoolId) {
    where += ` AND (school_id = $${idx++} OR school_id IS NULL)`;
    params.push(schoolId);
  }
  if (role) {
    where += ` AND actor_role = $${idx++}`;
    params.push(role);
  }
  if (childId) {
    where += ` AND (metadata->>'child_id') = $${idx++}`;
    params.push(String(childId));
  }

  const activeUsersQ = `select count(distinct actor_id) as active_users from analytics_events where ${where}`;
  const messagesQ = `select count(*) as messages_sent from analytics_events where ${where} and event_name = 'message_sent'`;
  const aiCallsQ = `select count(*) as ai_calls from analytics_events where ${where} and event_name = 'ai_call'`;
  const workflowRunsQ = `select count(*) as workflows_run from analytics_events where ${where} and event_name = 'workflow_run'`;

  const [activeUsers, messages, aiCalls, workflows] = await Promise.all([
    query(activeUsersQ, params),
    query(messagesQ, params),
    query(aiCallsQ, params),
    query(workflowRunsQ, params)
  ]);

  const aiWhereParams = [organizationId, start.toISOString(), end.toISOString()];
  let aiWhere = 'organization_id = $1 AND created_at >= $2 AND created_at <= $3';
  if (schoolId) {
    aiWhere += ' AND (school_id = $4 OR school_id IS NULL)';
    aiWhereParams.push(schoolId);
  }
  if (role) {
    aiWhere += schoolId ? ' and actor_role = $5' : ' and actor_role = $4';
    aiWhereParams.push(role);
  }
  if (childId) {
    const nextIdx = aiWhereParams.length + 1;
    aiWhere += ` and child_id = $${nextIdx}`;
    aiWhereParams.push(String(childId));
  }

  const ai = await query(
    `select count(*) as ai_calls,
            avg(safety_risk_score) as avg_risk_score,
            sum(case when safety_risk_score >= 0.5 then 1 else 0 end) as high_risk
     from ai_interactions
     where ${aiWhere}`,
    aiWhereParams
  );

  return {
    metrics: {
      active_users: Number(activeUsers.rows?.[0]?.active_users || 0),
      messages_sent: Number(messages.rows?.[0]?.messages_sent || 0),
      ai_calls: Number(aiCalls.rows?.[0]?.ai_calls || 0),
      workflow_runs: Number(workflows.rows?.[0]?.workflows_run || 0)
    },
    ai: {
      ai_calls: Number(ai.rows?.[0]?.ai_calls || 0),
      avg_risk_score: Number(ai.rows?.[0]?.avg_risk_score || 0),
      high_risk: Number(ai.rows?.[0]?.high_risk || 0)
    }
  };
}

async function rollupBySchool({ organizationId, start, end }) {
  const params = [organizationId, start.toISOString(), end.toISOString()];
  const sql = `
    select school_id,
           count(*) as events,
           count(distinct actor_id) as active_users,
           sum(case when event_name = 'message_sent' then 1 else 0 end) as messages_sent,
           sum(case when event_name = 'ai_call' then 1 else 0 end) as ai_calls
    from analytics_events
    where organization_id = $1 and event_ts >= $2 and event_ts <= $3
    group by school_id
    order by events desc`;
  const r = await query(sql, params);
  return r.rows || [];
}

async function rollupByRole({ organizationId, schoolId, start, end }) {
  const params = [organizationId, start.toISOString(), end.toISOString()];
  let where = 'organization_id = $1 and event_ts >= $2 and event_ts <= $3';
  if (schoolId) {
    where += ' and (school_id = $4 or school_id is null)';
    params.push(schoolId);
  }
  const sql = `
    select actor_role,
           count(*) as events,
           count(distinct actor_id) as active_users
    from analytics_events
    where ${where}
    group by actor_role
    order by events desc`;
  const r = await query(sql, params);
  return r.rows || [];
}

function buildWhere(tenant, filters = {}) {
  const { organizationId, schoolId } = tenant;
  const params = [organizationId];
  let idx = 2;
  let where = 'organization_id = $1';
  if (schoolId) {
    where += ` and (school_id = $${idx++} or school_id is null)`;
    params.push(schoolId);
  }
  if (filters.start) {
    where += ` and event_ts >= $${idx++}`;
    params.push(new Date(filters.start).toISOString());
  }
  if (filters.end) {
    where += ` and event_ts <= $${idx++}`;
    params.push(new Date(filters.end).toISOString());
  }
  if (filters.role) {
    where += ` and actor_role = $${idx++}`;
    params.push(filters.role);
  }
  if (filters.childId) {
    where += ` and (metadata->>'child_id') = $${idx++}`;
    params.push(String(filters.childId));
  }
  if (filters.schoolId) {
    where += ` and school_id = $${idx++}`;
    params.push(String(filters.schoolId));
  }
  return { where, params };
}

async function aggregateReport(tenant, definition, filters = {}) {
  const { where, params } = buildWhere(tenant, filters);
  if (definition.kind !== 'aggregate') return [];

  const table = definition.source === 'workflow_runs' ? 'workflow_runs' : 'analytics_events';
  const measures = (definition.measures || []).map((m) => `${m.op}(*) as ${m.as}`);
  const groupBy = definition.groupBy || [];

  let sql = `select ${groupBy.map((g) => g).join(', ')}${groupBy.length ? ',' : ''} ${measures.join(', ')} from ${table} where ${where}`;

  if (definition.where) {
    const keys = Object.keys(definition.where);
    keys.forEach((k) => {
      sql += ` and ${k} = $${params.length + 1}`;
      params.push(definition.where[k]);
    });
  }

  if (groupBy.length) {
    sql += ` group by ${groupBy.join(', ')}`;
  }
  sql += ' order by 1';

  const r = await query(sql, params);
  return r.rows || [];
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  });
  return lines.join('\n');
}

function renderPdf(res, rows, { title }) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);
  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown();

  rows.forEach((row) => {
    doc.fontSize(10).text(JSON.stringify(row, null, 2));
    doc.moveDown();
  });
  doc.end();
}

async function partnerUsageSummary({ organizationId, partnerId, start, end }) {
  const params = [organizationId, start.toISOString(), end.toISOString()];
  let where = 'organization_id = $1 and event_ts >= $2 and event_ts <= $3 and actor_role = $4';
  params.push('partner');
  if (partnerId) {
    where += ` and actor_id = $${params.length + 1}`;
    params.push(partnerId);
  }

  const usage = await query(
    `select event_name, count(*) as total
       from analytics_events
      where ${where}
        and event_name in ('partner_login', 'partner_invite_sent', 'partner_referral_click', 'partner_submission')
      group by event_name
      order by total desc`,
    params
  );

  const conversions = await query(
    `select count(*) as conversions
       from analytics_events
      where ${where}
        and event_name = 'partner_conversion'`,
    params
  );

  const clicks = usage.rows.find((row) => row.event_name === 'partner_referral_click');
  const conversionCount = Number(conversions.rows?.[0]?.conversions || 0);
  const clickCount = Number(clicks?.total || 0);

  return {
    usage: usage.rows || [],
    conversions: conversionCount,
    conversion_rate: clickCount ? conversionCount / clickCount : 0,
  };
}

async function partnerRevenueSummary({ districtId, partnerId, start, end }) {
  const params = [districtId, start.toISOString(), end.toISOString()];
  let where = 'district_id = $1 and event_ts >= $2 and event_ts <= $3';
  if (partnerId) {
    where += ` and partner_user_id = $${params.length + 1}`;
    params.push(partnerId);
  }

  const revenue = await query(
    `select coalesce(sum(revenue_amount), 0) as total_revenue,
            count(*) as revenue_events
       from public.partner_revenue_events
      where ${where}`,
    params
  );

  const attributions = await query(
    `select attribution_source, coalesce(sum(revenue_amount), 0) as revenue
       from public.partner_revenue_events
      where ${where}
      group by attribution_source
      order by revenue desc`,
    params
  );

  return {
    total_revenue: Number(revenue.rows?.[0]?.total_revenue || 0),
    revenue_events: Number(revenue.rows?.[0]?.revenue_events || 0),
    by_source: attributions.rows || [],
  };
}

router.post('/events', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  if (!events.length) return res.status(400).json({ error: 'no events' });
  const values = [];
  const params = [];
  let idx = 1;

  for (const evt of events) {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(
      evt.eventName,
      evt.eventTs || new Date().toISOString(),
      organizationId,
      schoolId || null,
      evt.actorId || null,
      evt.actorRole || null,
      evt.metadata ? JSON.stringify(evt.metadata) : JSON.stringify({}),
      evt.source || 'web'
    );
  }

  const sql = `
    insert into analytics_events (event_name, event_ts, organization_id, school_id, actor_id, actor_role, metadata, source)
    values ${values.join(',')}
    returning id`;
  const r = await query(sql, params);
  res.status(201).json({ inserted: r.rows.length });
});

router.get('/summary', requireAdmin, async (req, res) => {
  const { start, end } = parseTimeRange(req);
  const role = roleFilter(req);
  const childId = req.query.childId ? String(req.query.childId) : null;
  const scopedSchoolId = req.query.schoolId ? String(req.query.schoolId) : null;
  const { organizationId, schoolId } = req.tenant;
  const effectiveSchoolId = scopedSchoolId || schoolId;

  const { metrics, ai } = await summaryMetrics({
    organizationId,
    schoolId: effectiveSchoolId,
    start,
    end,
    role,
    childId
  });

  const rollups = {
    by_school: await rollupBySchool({ organizationId, start, end }),
    by_role: await rollupByRole({ organizationId, schoolId: effectiveSchoolId, start, end })
  };

  res.json({
    range: { start, end },
    metrics,
    ai,
    rollups
  });
});

router.get('/partners/summary', requireAnyScope(['partner:admin', 'partner:portal']), async (req, res) => {
  const { start, end } = parseTimeRange(req);
  const { organizationId } = req.tenant;
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId) || userId;
  if (!districtId && !organizationId) {
    return res.status(400).json({ error: 'tenant scope required' });
  }

  const usage = await partnerUsageSummary({ organizationId, partnerId, start, end });
  const revenue = await partnerRevenueSummary({
    districtId: districtId || organizationId,
    partnerId,
    start,
    end
  });

  res.json({
    range: { start, end },
    partnerId,
    usage,
    revenue
  });
});


router.get('/district-insights', requireAdmin, async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const params = [organizationId];
  let where = 'organization_id = $1';
  if (schoolId) {
    where += ' and (school_id = $2 or school_id is null)';
    params.push(schoolId);
  }

  const attendanceRisk = await query(
    `select
       sum(case when metadata->>'risk' = 'high' then 1 else 0 end) as high,
       sum(case when metadata->>'risk' = 'medium' then 1 else 0 end) as medium,
       sum(case when metadata->>'risk' = 'low' then 1 else 0 end) as low
     from analytics_events
     where ${where}
       and event_name = 'attendance_risk'`,
    params
  );

  const roi = await query(
    `select
       coalesce(metadata->>'program_name', 'Unspecified Program') as name,
       coalesce(sum((metadata->>'program_cost')::numeric), 0) as cost,
       coalesce(avg((metadata->>'impact_score')::numeric), 0) as score
     from analytics_events
     where ${where}
       and event_name = 'program_roi'
     group by 1
     order by score desc
     limit 10`,
    params
  );

  const high = Number(attendanceRisk.rows?.[0]?.high || 0);
  const medium = Number(attendanceRisk.rows?.[0]?.medium || 0);
  const low = Number(attendanceRisk.rows?.[0]?.low || 0);

  const insights = {
    attendanceRisk: {
      high,
      medium,
      low,
      trend: 'Live data'
    },
    programROI: (roi.rows || []).map((row) => ({
      name: row.name,
      cost: Number(row.cost || 0),
      impact: Number(row.score || 0) >= 80 ? 'High' : 'Medium',
      score: Math.max(0, Math.min(100, Math.round(Number(row.score || 0))))
    }))
  };

  if (!insights.programROI.length) {
    insights.programROI = [
      { name: 'After-school Tutoring', cost: 50000, impact: 'High', score: 92 },
      { name: 'Summer Reading', cost: 12000, impact: 'Medium', score: 65 },
      { name: 'STEM Robotics', cost: 25000, impact: 'High', score: 88 }
    ];
  }

  res.json({ insights });
});

router.get('/drilldown', requireAdmin, async (req, res) => {
  const { start, end } = parseTimeRange(req);
  const metric = req.query.metric ? String(req.query.metric) : null;
  const role = roleFilter(req);
  const childId = req.query.childId ? String(req.query.childId) : null;
  const scopedSchoolId = req.query.schoolId ? String(req.query.schoolId) : null;
  const { organizationId, schoolId } = req.tenant;
  const effectiveSchoolId = scopedSchoolId || schoolId;
  const { where, params } = buildWhere(
    { organizationId, schoolId: effectiveSchoolId },
    { start, end, role, childId, schoolId: scopedSchoolId }
  );

  let sql = 'select event_name, actor_id, actor_role, event_ts, metadata from analytics_events';
  sql += ` where ${where}`;
  if (metric) {
    sql += ` and event_name = $${params.length + 1}`;
    params.push(metric);
  }
  sql += ' order by event_ts desc limit 250';

  const r = await query(sql, params);
  res.json({ metric, rows: r.rows || [] });
});

router.post('/report', requireAdmin, async (req, res) => {
  const { definition, filters } = req.body || {};
  if (!definition) return res.status(400).json({ error: 'missing report definition' });
  const rows = await aggregateReport(req.tenant, definition, filters || {});
  res.json({ rows });
});

router.get('/export.csv', requireAdmin, async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { start, end } = parseTimeRange(req);
  const role = roleFilter(req);
  const childId = req.query.childId ? String(req.query.childId) : null;
  const scopedSchoolId = req.query.schoolId ? String(req.query.schoolId) : null;
  const effectiveSchoolId = scopedSchoolId || schoolId;
  const { where, params } = buildWhere(
    { organizationId, schoolId: effectiveSchoolId },
    { start, end, role, childId, schoolId: scopedSchoolId }
  );
  const r = await query(
    `select event_name, event_ts, actor_id, actor_role, school_id, metadata
     from analytics_events
     where ${where}
     order by event_ts desc
     limit 1000`,
    params
  );
  const csv = toCsv(r.rows || []);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.get('/export.pdf', requireAdmin, async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { start, end } = parseTimeRange(req);
  const role = roleFilter(req);
  const childId = req.query.childId ? String(req.query.childId) : null;
  const scopedSchoolId = req.query.schoolId ? String(req.query.schoolId) : null;
  const effectiveSchoolId = scopedSchoolId || schoolId;
  const { where, params } = buildWhere(
    { organizationId, schoolId: effectiveSchoolId },
    { start, end, role, childId, schoolId: scopedSchoolId }
  );
  const r = await query(
    `select event_name, event_ts, actor_id, actor_role, school_id, metadata
     from analytics_events
     where ${where}
     order by event_ts desc
     limit 200`,
    params
  );
  renderPdf(res, r.rows || [], { title: 'Teachmo Analytics Export' });
});

router.post('/report/export.csv', requireAdmin, async (req, res) => {
  const { definition, filters } = req.body || {};
  const rows = await aggregateReport(req.tenant, definition, filters || {});
  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

router.post('/report/export.pdf', requireAdmin, async (req, res) => {
  const { definition, filters } = req.body || {};
  const rows = await aggregateReport(req.tenant, definition, filters || {});
  renderPdf(res, rows, { title: 'Teachmo Report Export' });
});

export default router;
