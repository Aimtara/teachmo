/* eslint-env node */
import { query } from '../db.js';
import { enqueueMessage } from '../jobs/notificationQueue.js';

export function clampNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function parseRange({ start, end, defaultDays = 7 } = {}) {
  const endDate = end ? new Date(String(end)) : new Date();
  const startDate = start ? new Date(String(start)) : new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000);
  return { start: startDate, end: endDate };
}

export async function loadApiSummary({ organizationId, schoolId, start, end }) {
  const params = [organizationId, schoolId || null, start.toISOString(), end.toISOString()];
  const summary = await query(
    `select count(*) as total,
            avg(latency_ms) as avg_latency,
            percentile_disc(0.95) within group (order by latency_ms) as p95_latency,
            sum(case when status_code >= 400 then 1 else 0 end) as errors
     from api_request_metrics
     where organization_id = $1
       and (school_id is null or school_id = $2)
       and created_at >= $3 and created_at <= $4`,
    params
  );

  const trend = await query(
    `select date_trunc('day', created_at) as day,
            count(*) as total,
            avg(latency_ms) as avg_latency,
            percentile_disc(0.95) within group (order by latency_ms) as p95_latency,
            sum(case when status_code >= 400 then 1 else 0 end) as errors
     from api_request_metrics
     where organization_id = $1
       and (school_id is null or school_id = $2)
       and created_at >= $3 and created_at <= $4
     group by 1
     order by 1`,
    params
  );

  const summaryRow = summary.rows?.[0] || {};
  return {
    summary: {
      total: clampNumber(summaryRow.total),
      avg_latency: clampNumber(summaryRow.avg_latency),
      p95_latency: clampNumber(summaryRow.p95_latency),
      errors: clampNumber(summaryRow.errors)
    },
    trend: (trend.rows || []).map((row) => ({
      day: row.day,
      total: clampNumber(row.total),
      avg_latency: clampNumber(row.avg_latency),
      p95_latency: clampNumber(row.p95_latency),
      errors: clampNumber(row.errors)
    }))
  };
}

export async function loadAiSummary({ organizationId, schoolId, start, end }) {
  const params = [organizationId, schoolId || null, start.toISOString(), end.toISOString()];
  const result = await query(
    `select count(*) as ai_calls,
            sum(token_total) as tokens,
            avg(latency_ms) as avg_latency,
            sum(cost_usd) as cost_usd
     from ai_interactions
     where organization_id = $1
       and (school_id is null or school_id = $2)
       and created_at >= $3 and created_at <= $4`,
    params
  );
  const row = result.rows?.[0] || {};
  return {
    ai_calls: clampNumber(row.ai_calls),
    tokens: clampNumber(row.tokens),
    avg_latency: clampNumber(row.avg_latency),
    cost_usd: clampNumber(row.cost_usd)
  };
}

export async function loadNotificationSummary({ organizationId, schoolId, start, end }) {
  const params = [organizationId, schoolId || null, start.toISOString(), end.toISOString()];
  const result = await query(
    `select
        sum(case when e.event_type = 'delivered' then 1 else 0 end) as delivered,
        sum(case when e.event_type = 'bounced' then 1 else 0 end) as bounced,
        sum(case when e.event_type = 'opened' then 1 else 0 end) as opened,
        sum(case when e.event_type = 'clicked' then 1 else 0 end) as clicked,
        count(*) as total_events
     from public.notification_events e
     join public.notification_messages m on m.id = e.message_id
     where m.organization_id = $1
       and (m.school_id is null or m.school_id = $2)
       and e.event_ts >= $3 and e.event_ts <= $4`,
    params
  );
  const row = result.rows?.[0] || {};
  return {
    delivered: clampNumber(row.delivered),
    bounced: clampNumber(row.bounced),
    opened: clampNumber(row.opened),
    clicked: clampNumber(row.clicked),
    total_events: clampNumber(row.total_events)
  };
}

export async function loadObservabilitySummary({ organizationId, schoolId, start, end }) {
  const [api, ai, notifications] = await Promise.all([
    loadApiSummary({ organizationId, schoolId, start, end }),
    loadAiSummary({ organizationId, schoolId, start, end }),
    loadNotificationSummary({ organizationId, schoolId, start, end })
  ]);

  const errorTrend = api.trend.map((row) => ({
    day: row.day,
    error_rate: row.total ? row.errors / row.total : 0,
    total: row.total,
    errors: row.errors
  }));

  return { api, ai, notifications, errorTrend };
}

export async function evaluateAlertRules({ organizationId, schoolId } = {}) {
  const rulesResult = await query(
    `select *
     from alert_rules
     where enabled = true
       and organization_id = $1
       and (school_id is null or school_id = $2)`,
    [organizationId, schoolId || null]
  );

  const now = new Date();
  const triggered = [];

  for (const rule of rulesResult.rows || []) {
    const windowMinutes = Number(rule.window_minutes || 60);
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
    const metricValue = await resolveMetricValue({ rule, windowStart, now });
    if (metricValue === null || metricValue === undefined) continue;

    let baselineValue = null;
    let shouldTrigger = false;

    if (rule.anomaly) {
      const baseline = await resolveBaselineValue({ rule, windowStart });
      baselineValue = baseline;
      const factor = Number(rule.anomaly_factor || 1.5);
      if (baseline !== null && baseline > 0) {
        shouldTrigger = metricValue >= baseline * factor;
      }
    } else {
      shouldTrigger = compareMetric({ value: metricValue, comparison: rule.comparison, threshold: rule.threshold });
    }

    if (!shouldTrigger) continue;

    const cooldownMinutes = Number(rule.cooldown_minutes || 60);
    const cooldownStart = new Date(now.getTime() - cooldownMinutes * 60 * 1000);
    const recent = await query(
      `select 1
       from alert_events
       where rule_id = $1 and triggered_at >= $2
       limit 1`,
      [rule.id, cooldownStart.toISOString()]
    );
    if (recent.rows?.length) continue;

    const event = await query(
      `insert into alert_events
        (rule_id, organization_id, school_id, metric_value, baseline_value, details)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning *`,
      [
        rule.id,
        rule.organization_id,
        rule.school_id,
        metricValue,
        baselineValue,
        JSON.stringify({
          metricKey: rule.metric_key,
          comparison: rule.comparison,
          threshold: rule.threshold,
          windowMinutes
        })
      ]
    );
    const eventRow = event.rows?.[0];
    if (eventRow) {
      await notifyAlert({ rule, metricValue, baselineValue, event: eventRow });
      triggered.push(eventRow);
    }
  }

  return triggered;
}

async function resolveMetricValue({ rule, windowStart, now }) {
  const params = [rule.organization_id, rule.school_id || null, windowStart.toISOString(), now.toISOString()];
  if (rule.metric_key === 'api_error_rate') {
    const result = await query(
      `select count(*) as total,
              sum(case when status_code >= 400 then 1 else 0 end) as errors
       from api_request_metrics
       where organization_id = $1
         and (school_id is null or school_id = $2)
         and created_at >= $3 and created_at <= $4`,
      params
    );
    const total = clampNumber(result.rows?.[0]?.total);
    const errors = clampNumber(result.rows?.[0]?.errors);
    return total ? errors / total : 0;
  }

  if (rule.metric_key === 'api_latency_p95') {
    const result = await query(
      `select percentile_disc(0.95) within group (order by latency_ms) as p95
       from api_request_metrics
       where organization_id = $1
         and (school_id is null or school_id = $2)
         and created_at >= $3 and created_at <= $4`,
      params
    );
    return clampNumber(result.rows?.[0]?.p95);
  }

  if (rule.metric_key === 'ai_cost_usd') {
    const result = await query(
      `select sum(cost_usd) as cost_usd
       from ai_interactions
       where organization_id = $1
         and (school_id is null or school_id = $2)
         and created_at >= $3 and created_at <= $4`,
      params
    );
    return clampNumber(result.rows?.[0]?.cost_usd);
  }

  if (rule.metric_key === 'notification_bounce_rate') {
    const result = await query(
      `select count(*) as total,
              sum(case when e.event_type = 'bounced' then 1 else 0 end) as bounced
       from public.notification_events e
       join public.notification_messages m on m.id = e.message_id
       where m.organization_id = $1
         and (m.school_id is null or m.school_id = $2)
         and e.event_ts >= $3 and e.event_ts <= $4`,
      params
    );
    const total = clampNumber(result.rows?.[0]?.total);
    const bounced = clampNumber(result.rows?.[0]?.bounced);
    return total ? bounced / total : 0;
  }

  return null;
}

async function resolveBaselineValue({ rule, windowStart }) {
  const baselineEnd = new Date(windowStart.getTime());
  const baselineStart = new Date(baselineEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return resolveMetricValue({
    rule,
    windowStart: baselineStart,
    now: baselineEnd
  });
}

function compareMetric({ value, comparison, threshold }) {
  const numericThreshold = Number(threshold);
  if (!Number.isFinite(numericThreshold)) return false;
  if (comparison === 'gt') return value > numericThreshold;
  if (comparison === 'gte') return value >= numericThreshold;
  if (comparison === 'lt') return value < numericThreshold;
  if (comparison === 'lte') return value <= numericThreshold;
  return false;
}

async function notifyAlert({ rule, metricValue, baselineValue, event }) {
  const segment = rule.segment && Object.keys(rule.segment).length
    ? rule.segment
    : { roles: ['system_admin', 'school_admin', 'district_admin'] };

  const title = `Teachmo alert: ${rule.name}`;
  const body = [
    `Rule: ${rule.name}`,
    `Metric: ${rule.metric_key}`,
    `Value: ${metricValue}`,
    baselineValue !== null && baselineValue !== undefined ? `Baseline: ${baselineValue}` : null,
    `Window: ${rule.window_minutes} minutes`
  ].filter(Boolean).join('\n');

  const message = await query(
    `insert into public.notification_messages
     (organization_id, school_id, channel, title, body, payload, segment, status)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'pending')
     returning id`,
    [
      rule.organization_id,
      rule.school_id || null,
      rule.channel || 'email',
      title,
      body,
      JSON.stringify({ alert_event_id: event.id }),
      JSON.stringify(segment)
    ]
  );

  const messageId = message.rows?.[0]?.id;
  if (messageId) {
    await enqueueMessage({ messageId });
  }
}

export function getNextRunAt({ frequency, now = new Date() }) {
  const next = new Date(now.getTime());
  if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 7);
  }
  return next.toISOString();
}

export function reportRangeForFrequency({ frequency, now = new Date() }) {
  const end = new Date(now.getTime());
  const start = new Date(now.getTime());
  if (frequency === 'monthly') {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 7);
  }
  return { start, end };
}

export async function buildReportPayload({ organizationId, schoolId, reportType, frequency }) {
  const { start, end } = reportRangeForFrequency({ frequency });
  if (reportType === 'metrics_summary') {
    const summary = await loadObservabilitySummary({ organizationId, schoolId, start, end });
    return { range: { start, end }, summary };
  }
  if (reportType === 'error_trends') {
    const api = await loadApiSummary({ organizationId, schoolId, start, end });
    return { range: { start, end }, errorTrend: api.trend };
  }
  if (reportType === 'ai_usage') {
    const ai = await loadAiSummary({ organizationId, schoolId, start, end });
    return { range: { start, end }, ai };
  }
  return { range: { start, end }, note: 'Report type not recognized.' };
}
