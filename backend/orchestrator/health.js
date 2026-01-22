/* eslint-env node */
import { query } from '../db.js';

async function getHourlySeries(familyId, hours = 24) {
  const h = Math.max(1, Math.min(72, Number(hours) || 24));
  const res = await query(
    `
    SELECT hour, signals, ingests, suppressed, duplicates, actions_created, actions_completed
    FROM orchestrator_hourly_snapshots
    WHERE family_id = $1 AND hour >= now() - ($2 || ' hours')::interval
    ORDER BY hour ASC
    `,
    [familyId, String(h)]
  );

  return res.rows.map((r) => ({
    hour: new Date(r.hour).toISOString(),
    signals: r.signals,
    ingests: r.ingests,
    suppressed: r.suppressed,
    duplicates: r.duplicates,
    actionsCreated: r.actions_created,
    actionsCompleted: r.actions_completed
  }));
}

// fallback: live computation if snapshots missing
async function getFamilyHealthLive(familyId, daysInt, includeHourly = false) {
  const since = `now() - (${daysInt} || ' days')::interval`;

  const signalsRes = await query(
    `
    SELECT date_trunc('day', occurred_at) AS day, COUNT(*)::int AS signals
    FROM orchestrator_signals
    WHERE family_id = $1 AND occurred_at >= ${since}
    GROUP BY 1 ORDER BY 1 ASC
    `,
    [familyId]
  );

  const actionsCreatedRes = await query(
    `
    SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS actions_created
    FROM orchestrator_actions
    WHERE family_id = $1 AND created_at >= ${since}
    GROUP BY 1 ORDER BY 1 ASC
    `,
    [familyId]
  );

  const actionsCompletedRes = await query(
    `
    SELECT date_trunc('day', completed_at) AS day, COUNT(*)::int AS actions_completed
    FROM orchestrator_actions
    WHERE family_id = $1 AND completed_at IS NOT NULL AND completed_at >= ${since}
    GROUP BY 1 ORDER BY 1 ASC
    `,
    [familyId]
  );

  const ingestRes = await query(
    `
    SELECT
      date_trunc('day', created_at) AS day,
      COUNT(*)::int AS ingests,
      SUM(CASE WHEN suppressed_reason IS NOT NULL THEN 1 ELSE 0 END)::int AS suppressed,
      SUM(CASE WHEN suppressed_reason = 'duplicate_signal' THEN 1 ELSE 0 END)::int AS duplicates
    FROM orchestrator_decision_traces
    WHERE family_id = $1 AND trigger_type = 'ingest' AND created_at >= ${since}
    GROUP BY 1 ORDER BY 1 ASC
    `,
    [familyId]
  );

  const totals = ingestRes.rows.reduce(
    (acc, r) => {
      acc.ingests += Number(r.ingests || 0);
      acc.suppressed += Number(r.suppressed || 0);
      acc.duplicates += Number(r.duplicates || 0);
      return acc;
    },
    { ingests: 0, suppressed: 0, duplicates: 0 }
  );

  return {
    familyId,
    windowDays: daysInt,
    generatedAt: new Date().toISOString(),
    source: 'live',
    totals: {
      ingests: totals.ingests,
      suppressed: totals.suppressed,
      duplicates: totals.duplicates,
      suppressedRate: totals.ingests ? totals.suppressed / totals.ingests : 0,
      duplicateRate: totals.ingests ? totals.duplicates / totals.ingests : 0
    },
    series: {
      signalsPerDay: signalsRes.rows.map((r) => ({ day: new Date(r.day).toISOString(), count: r.signals })),
      ingestsPerDay: ingestRes.rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        ingests: r.ingests,
        suppressed: r.suppressed,
        duplicates: r.duplicates
      })),
      actionsCreatedPerDay: actionsCreatedRes.rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        count: r.actions_created
      })),
      actionsCompletedPerDay: actionsCompletedRes.rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        count: r.actions_completed
      }))
    },
    hourly: includeHourly ? [] : null
  };
}

export async function getFamilyHealth(familyId, { days = 14, hourly = false, hourlyHours = 24 } = {}) {
  const daysInt = Math.max(1, Math.min(90, Number(days) || 14));
  const includeHourly = String(hourly ?? 'false').toLowerCase() === 'true';
  const hourlyWindow = Number(hourlyHours ?? 24);

  const snapRes = await query(
    `
    SELECT day, signals, ingests, suppressed, duplicates,
           actions_created, actions_completed,
           forbidden_family, auth_invalid_token, auth_missing_token, updated_at
    FROM orchestrator_daily_snapshots
    WHERE family_id = $1 AND day >= (current_date - $2::int)
    ORDER BY day ASC
    `,
    [familyId, daysInt]
  );

  // If snapshots are missing, fall back to live.
  if (snapRes.rowCount === 0) {
    return getFamilyHealthLive(familyId, daysInt, includeHourly);
  }

  const rows = snapRes.rows;

  const totals = rows.reduce(
    (acc, r) => {
      acc.ingests += r.ingests;
      acc.suppressed += r.suppressed;
      acc.duplicates += r.duplicates;
      return acc;
    },
    { ingests: 0, suppressed: 0, duplicates: 0 }
  );

  let hourlySeries = null;
  if (includeHourly) {
    hourlySeries = await getHourlySeries(familyId, hourlyWindow);
  }

  return {
    familyId,
    windowDays: daysInt,
    generatedAt: new Date().toISOString(),
    source: 'snapshot',
    snapshotUpdatedAt: new Date(rows[rows.length - 1].updated_at).toISOString(),
    totals: {
      ingests: totals.ingests,
      suppressed: totals.suppressed,
      duplicates: totals.duplicates,
      suppressedRate: totals.ingests ? totals.suppressed / totals.ingests : 0,
      duplicateRate: totals.ingests ? totals.duplicates / totals.ingests : 0
    },
    series: {
      signalsPerDay: rows.map((r) => ({ day: new Date(r.day).toISOString(), count: r.signals })),
      ingestsPerDay: rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        ingests: r.ingests,
        suppressed: r.suppressed,
        duplicates: r.duplicates
      })),
      actionsCreatedPerDay: rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        count: r.actions_created
      })),
      actionsCompletedPerDay: rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        count: r.actions_completed
      })),
      securityNoisePerDay: rows.map((r) => ({
        day: new Date(r.day).toISOString(),
        forbiddenFamily: r.forbidden_family,
        invalidToken: r.auth_invalid_token,
        missingToken: r.auth_missing_token
      }))
    },
    hourly: hourlySeries
  };
}
