/* eslint-env node */
import { query } from '../db.js';

async function listFamilyIds() {
  const res = await query(`SELECT DISTINCT family_id FROM family_memberships`);
  return res.rows.map((r) => r.family_id);
}

function merge(map, hour, key, val) {
  if (!map.has(hour)) map.set(hour, {});
  const o = map.get(hour);
  o[key] = (o[key] ?? 0) + Number(val ?? 0);
}

async function getHourlyCounts(familyId, hoursBack) {
  const since = `now() - (${hoursBack} || ' hours')::interval`;
  const out = new Map(); // hour(ts) -> metrics

  // signals/hour
  {
    const res = await query(
      `
      SELECT date_trunc('hour', occurred_at) AS hour, COUNT(*)::int AS c
      FROM orchestrator_signals
      WHERE family_id = $1 AND occurred_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) merge(out, r.hour.toISOString(), 'signals', r.c);
  }

  // ingests/suppressed/duplicates via traces
  {
    const res = await query(
      `
      SELECT date_trunc('hour', created_at) AS hour,
             COUNT(*)::int AS ingests,
             SUM(CASE WHEN suppressed_reason IS NOT NULL THEN 1 ELSE 0 END)::int AS suppressed,
             SUM(CASE WHEN suppressed_reason = 'duplicate_signal' THEN 1 ELSE 0 END)::int AS duplicates
      FROM orchestrator_decision_traces
      WHERE family_id = $1 AND trigger_type = 'ingest' AND created_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) {
      merge(out, r.hour.toISOString(), 'ingests', r.ingests);
      merge(out, r.hour.toISOString(), 'suppressed', r.suppressed);
      merge(out, r.hour.toISOString(), 'duplicates', r.duplicates);
    }
  }

  // actions created/hour
  {
    const res = await query(
      `
      SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS c
      FROM orchestrator_actions
      WHERE family_id = $1 AND created_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) merge(out, r.hour.toISOString(), 'actions_created', r.c);
  }

  // actions completed/hour
  {
    const res = await query(
      `
      SELECT date_trunc('hour', completed_at) AS hour, COUNT(*)::int AS c
      FROM orchestrator_actions
      WHERE family_id = $1 AND completed_at IS NOT NULL AND completed_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) merge(out, r.hour.toISOString(), 'actions_completed', r.c);
  }

  return out;
}

async function upsertRow(familyId, hourIso, m) {
  await query(
    `
    INSERT INTO orchestrator_hourly_snapshots
      (family_id, hour, signals, ingests, suppressed, duplicates, actions_created, actions_completed, updated_at)
    VALUES
      ($1, $2::timestamptz, $3, $4, $5, $6, $7, $8, now())
    ON CONFLICT (family_id, hour) DO UPDATE SET
      signals = EXCLUDED.signals,
      ingests = EXCLUDED.ingests,
      suppressed = EXCLUDED.suppressed,
      duplicates = EXCLUDED.duplicates,
      actions_created = EXCLUDED.actions_created,
      actions_completed = EXCLUDED.actions_completed,
      updated_at = now()
    `,
    [
      familyId,
      hourIso,
      m.signals ?? 0,
      m.ingests ?? 0,
      m.suppressed ?? 0,
      m.duplicates ?? 0,
      m.actions_created ?? 0,
      m.actions_completed ?? 0
    ]
  );
}

async function run({ hoursBack = 48 } = {}) {
  const familyIds = await listFamilyIds();
  const results = [];

  for (const familyId of familyIds) {
    const map = await getHourlyCounts(familyId, hoursBack);

    // Ensure current hour exists so charts don’t look empty
    const nowHour = new Date();
    nowHour.setMinutes(0, 0, 0);
    const nowHourIso = nowHour.toISOString();
    if (!map.has(nowHourIso)) map.set(nowHourIso, {});

    for (const [hourIso, metrics] of map.entries()) {
      await upsertRow(familyId, hourIso, metrics);
    }

    results.push({ familyId, hoursBack, rows: map.size });
  }

  return results;
}

async function main() {
  const hoursBack = Number(process.argv[2] ?? 48);
  const out = await run({ hoursBack: Math.max(1, Math.min(168, hoursBack)) }); // up to 7 days
  console.log(JSON.stringify({ ok: true, results: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
