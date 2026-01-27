/* eslint-env node */
import { query } from '../db.js';

function isoDay(d) {
  // YYYY-MM-DD
  return new Date(d).toISOString().slice(0, 10);
}

async function listFamilyIds() {
  // Any family with memberships is “real” enough to snapshot
  const res = await query(`SELECT DISTINCT family_id FROM family_memberships`);
  return res.rows.map((r) => r.family_id);
}

function mergeCounts(map, day, key, val) {
  if (!map.has(day)) map.set(day, {});
  const obj = map.get(day);
  obj[key] = (obj[key] ?? 0) + Number(val ?? 0);
}

async function getCountsByDay(familyId, days) {
  const since = `now() - (${days} || ' days')::interval`;

  const out = new Map(); // day -> metrics object

  // signals
  {
    const res = await query(
      `
      SELECT date_trunc('day', occurred_at)::date AS day, COUNT(*)::int AS c
      FROM orchestrator_signals
      WHERE family_id = $1 AND occurred_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) mergeCounts(out, r.day, 'signals', r.c);
  }

  // ingests + suppressed + duplicates (decision traces)
  {
    const res = await query(
      `
      SELECT date_trunc('day', created_at)::date AS day,
             COUNT(*)::int AS ingests,
             SUM(CASE WHEN suppressed_reason IS NOT NULL THEN 1 ELSE 0 END)::int AS suppressed,
             SUM(CASE WHEN suppressed_reason = 'duplicate_signal' THEN 1 ELSE 0 END)::int AS duplicates
      FROM orchestrator_decision_traces
      WHERE family_id = $1
        AND trigger_type = 'ingest'
        AND created_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) {
      mergeCounts(out, r.day, 'ingests', r.ingests);
      mergeCounts(out, r.day, 'suppressed', r.suppressed);
      mergeCounts(out, r.day, 'duplicates', r.duplicates);
    }
  }

  // actions created
  {
    const res = await query(
      `
      SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS c
      FROM orchestrator_actions
      WHERE family_id = $1 AND created_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) mergeCounts(out, r.day, 'actions_created', r.c);
  }

  // actions completed
  {
    const res = await query(
      `
      SELECT date_trunc('day', completed_at)::date AS day, COUNT(*)::int AS c
      FROM orchestrator_actions
      WHERE family_id = $1 AND completed_at IS NOT NULL AND completed_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) mergeCounts(out, r.day, 'actions_completed', r.c);
  }

  // audit events (auth noise)
  {
    const res = await query(
      `
      SELECT date_trunc('day', created_at)::date AS day,
             SUM(CASE WHEN event_type = 'forbidden_family' THEN 1 ELSE 0 END)::int AS forbidden_family,
             SUM(CASE WHEN event_type = 'auth_invalid_token' THEN 1 ELSE 0 END)::int AS auth_invalid_token,
             SUM(CASE WHEN event_type = 'auth_missing_token' THEN 1 ELSE 0 END)::int AS auth_missing_token
      FROM security_audit_events
      WHERE family_id = $1 AND created_at >= ${since}
      GROUP BY 1
      `,
      [familyId]
    );
    for (const r of res.rows) {
      mergeCounts(out, r.day, 'forbidden_family', r.forbidden_family);
      mergeCounts(out, r.day, 'auth_invalid_token', r.auth_invalid_token);
      mergeCounts(out, r.day, 'auth_missing_token', r.auth_missing_token);
    }
  }

  return out;
}

async function upsertSnapshotRow(familyId, day, m) {
  await query(
    `
    INSERT INTO orchestrator_daily_snapshots
      (family_id, day, signals, ingests, suppressed, duplicates, actions_created, actions_completed,
       forbidden_family, auth_invalid_token, auth_missing_token, updated_at)
    VALUES
      ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
    ON CONFLICT (family_id, day) DO UPDATE SET
      signals = EXCLUDED.signals,
      ingests = EXCLUDED.ingests,
      suppressed = EXCLUDED.suppressed,
      duplicates = EXCLUDED.duplicates,
      actions_created = EXCLUDED.actions_created,
      actions_completed = EXCLUDED.actions_completed,
      forbidden_family = EXCLUDED.forbidden_family,
      auth_invalid_token = EXCLUDED.auth_invalid_token,
      auth_missing_token = EXCLUDED.auth_missing_token,
      updated_at = now()
    `,
    [
      familyId,
      day,
      m.signals ?? 0,
      m.ingests ?? 0,
      m.suppressed ?? 0,
      m.duplicates ?? 0,
      m.actions_created ?? 0,
      m.actions_completed ?? 0,
      m.forbidden_family ?? 0,
      m.auth_invalid_token ?? 0,
      m.auth_missing_token ?? 0
    ]
  );
}

async function run({ days = 14 } = {}) {
  const familyIds = await listFamilyIds();
  const results = [];

  for (const familyId of familyIds) {
    const map = await getCountsByDay(familyId, days);

    // Ensure at least “today” exists so charts don’t look empty
    const today = isoDay(new Date());
    if (!map.has(today)) map.set(today, {});

    for (const [day, metrics] of map.entries()) {
      await upsertSnapshotRow(familyId, day, metrics);
    }

    results.push({ familyId, days, rows: map.size });
  }

  return results;
}

async function main() {
  const days = Number(process.argv[2] ?? 14);
  const out = await run({ days: Math.max(1, Math.min(90, days)) });
  console.log(JSON.stringify({ ok: true, results: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
