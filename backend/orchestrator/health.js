/* eslint-env node */
import { query } from '../db.js';

export async function getFamilyHealth(familyId, { days = 14 } = {}) {
  const daysInt = Math.max(1, Math.min(90, Number(days) || 14));
  const since = `now() - (${daysInt} || ' days')::interval`;

  // signals/day
  const signalsRes = await query(
    `
    SELECT date_trunc('day', occurred_at) AS day, COUNT(*)::int AS signals
    FROM orchestrator_signals
    WHERE family_id = $1 AND occurred_at >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    [familyId]
  );

  // actions created/day
  const actionsCreatedRes = await query(
    `
    SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS actions_created
    FROM orchestrator_actions
    WHERE family_id = $1 AND created_at >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    [familyId]
  );

  // actions completed/day
  const actionsCompletedRes = await query(
    `
    SELECT date_trunc('day', completed_at) AS day, COUNT(*)::int AS actions_completed
    FROM orchestrator_actions
    WHERE family_id = $1 AND completed_at IS NOT NULL AND completed_at >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    [familyId]
  );

  // ingest suppression/duplicates/day via decision traces
  const ingestRes = await query(
    `
    SELECT
      date_trunc('day', created_at) AS day,
      COUNT(*)::int AS ingests,
      SUM(CASE WHEN suppressed_reason IS NOT NULL THEN 1 ELSE 0 END)::int AS suppressed,
      SUM(CASE WHEN suppressed_reason = 'duplicate_signal' THEN 1 ELSE 0 END)::int AS duplicates
    FROM orchestrator_decision_traces
    WHERE family_id = $1
      AND trigger_type = 'ingest'
      AND created_at >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
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

  const suppressedRate = totals.ingests > 0 ? totals.suppressed / totals.ingests : 0;
  const duplicateRate = totals.ingests > 0 ? totals.duplicates / totals.ingests : 0;

  return {
    familyId,
    windowDays: daysInt,
    generatedAt: new Date().toISOString(),
    totals: {
      ingests: totals.ingests,
      suppressed: totals.suppressed,
      duplicates: totals.duplicates,
      suppressedRate,
      duplicateRate
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
    }
  };
}
