/* eslint-env node */
import { query } from '../db.js';
import {
  buildReportPayload,
  evaluateAlertRules,
  getNextRunAt
} from '../utils/observability.js';
import { enqueueMessage } from './notificationQueue.js';

async function runScheduledReports() {
  const now = new Date();
  const due = await query(
    `select *
     from scheduled_reports
     where enabled = true
       and next_run_at is not null
       and next_run_at <= $1
     order by next_run_at asc
     limit 25`,
    [now.toISOString()]
  );

  for (const report of due.rows || []) {
    const payload = await buildReportPayload({
      organizationId: report.organization_id,
      schoolId: report.school_id,
      reportType: report.report_type,
      frequency: report.frequency
    });

    const title = `Teachmo ${report.name}`;
    const body = `Report type: ${report.report_type}\nRange: ${payload.range?.start} → ${payload.range?.end}`;

    const message = await query(
      `insert into public.notification_messages
       (organization_id, school_id, channel, title, body, payload, segment, status)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'pending')
       returning id`,
      [
        report.organization_id,
        report.school_id || null,
        report.channel || 'email',
        title,
        body,
        JSON.stringify({ report_id: report.id, report_payload: payload }),
        JSON.stringify(report.segment || { roles: ['system_admin', 'school_admin', 'district_admin'] })
      ]
    );

    const messageId = message.rows?.[0]?.id;
    if (messageId) {
      await enqueueMessage({ messageId });
    }

    await query(
      `insert into scheduled_report_runs
        (report_id, organization_id, school_id, status, payload)
       values ($1, $2, $3, 'sent', $4::jsonb)`,
      [report.id, report.organization_id, report.school_id || null, JSON.stringify(payload)]
    );

    const nextRunAt = getNextRunAt({ frequency: report.frequency, now });
    await query(
      `update scheduled_reports
       set last_run_at = $2,
           next_run_at = $3,
           updated_at = now()
       where id = $1`,
      [report.id, now.toISOString(), nextRunAt]
    );
  }
}

export function startObservabilitySchedulers({
  alertIntervalMs = Number(process.env.ALERT_RULE_INTERVAL_MS || 300000),
  reportIntervalMs = Number(process.env.REPORT_SCHEDULE_INTERVAL_MS || 3600000),
} = {}) {
  const enabled = String(process.env.OBSERVABILITY_SCHEDULER_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return null;

  const alertTimer = setInterval(() => {
    query(
      `select distinct organization_id, school_id
       from alert_rules
       where enabled = true`
    )
      .then(async (result) => {
        for (const row of result.rows || []) {
          await evaluateAlertRules({ organizationId: row.organization_id, schoolId: row.school_id });
        }
      })
      .catch((error) => {
        console.error('[observability] alert scheduler failed', error);
      });
  }, alertIntervalMs);

  const reportTimer = setInterval(() => {
    runScheduledReports().catch((error) => {
      console.error('[observability] report scheduler failed', error);
    });
  }, reportIntervalMs);

  return { alertTimer, reportTimer };
}
