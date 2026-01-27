/* eslint-env node */
import { query } from '../db.js';
import { orchestratorPgStore } from './pgStore.js';
import { auditEventBare } from '../security/audit.js';

function envBool(name, def = 'false') {
  return String(process.env[name] ?? def).toLowerCase() === 'true';
}

function envInt(name, def) {
  const n = parseInt(process.env[name] ?? String(def), 10);
  return Number.isFinite(n) ? n : def;
}

export async function getActiveMitigation(familyId, mitigationType) {
  const res = await query(
    `
    SELECT active, activated_at, expires_at, previous_state_json, applied_patch_json, meta, count
    FROM orchestrator_mitigations
    WHERE family_id = $1 AND mitigation_type = $2
    LIMIT 1
    `,
    [familyId, mitigationType]
  );
  if (res.rowCount === 0) return null;
  const r = res.rows[0];
  return {
    active: r.active,
    activatedAt: r.activated_at ? new Date(r.activated_at).toISOString() : null,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
    previous: r.previous_state_json ?? null,
    patch: r.applied_patch_json ?? null,
    meta: r.meta ?? {},
    count: r.count ?? 0
  };
}

export async function applyDuplicateStormMitigation({ familyId, duplicateCount, windowMinutes = 10 }) {
  if (!envBool('ORCH_AUTOMITIGATE_DUPLICATES', 'true')) {
    return { applied: false, reason: 'disabled' };
  }

  const threshold = envInt('ORCH_DUPLICATE_MITIGATION_THRESHOLD', 15);
  if (Number(duplicateCount || 0) < threshold) {
    return { applied: false, reason: 'below_threshold' };
  }

  const now = new Date();

  // If already active and not expired, just bump count/meta
  const current = await getActiveMitigation(familyId, 'duplicate_storm');
  if (current?.active && current.expiresAt && new Date(current.expiresAt) > now) {
    await query(
      `
      UPDATE orchestrator_mitigations
      SET last_updated = now(), count = count + 1,
          meta = jsonb_set(coalesce(meta,'{}'::jsonb), '{lastDuplicateCount}', to_jsonb($3::int), true)
      WHERE family_id = $1 AND mitigation_type = $2
      `,
      [familyId, 'duplicate_storm', Number(duplicateCount)]
    );
    return { applied: false, reason: 'already_active', expiresAt: current.expiresAt };
  }

  const cooldownMin = envInt('ORCH_DUPLICATE_MITIGATION_COOLDOWN_MIN', 60);
  const maxNotifs = envInt('ORCH_DUPLICATE_MITIGATION_MAX_NOTIFS_PER_HOUR', 0);

  const state = await orchestratorPgStore.getState(familyId);
  if (!state) return { applied: false, reason: 'no_state' };

  const expiresAt = new Date(now.getTime() + cooldownMin * 60 * 1000).toISOString();

  const prev = {
    cooldownUntil: state.cooldownUntil ?? null,
    maxNotificationsPerHour: state.maxNotificationsPerHour ?? null
  };

  const patch = {
    cooldownUntil: expiresAt,
    maxNotificationsPerHour: Math.min(state.maxNotificationsPerHour ?? 99, maxNotifs),
    mitigation: {
      type: 'duplicate_storm',
      active: true,
      appliedAt: now.toISOString(),
      expiresAt,
      reason: 'Duplicate signal storm detected; entering quiet mode temporarily.',
      prev
    }
  };

  const next = {
    ...state,
    ...patch,
    updatedAt: now.toISOString()
  };

  await orchestratorPgStore.upsertState(next);

  await query(
    `
    INSERT INTO orchestrator_mitigations
      (family_id, mitigation_type, active, activated_at, expires_at, last_updated, count, previous_state_json, applied_patch_json, meta)
    VALUES
      ($1, $2, true, now(), $3::timestamptz, now(), 1, $4::jsonb, $5::jsonb, $6::jsonb)
    ON CONFLICT (family_id, mitigation_type) DO UPDATE SET
      active = true,
      activated_at = now(),
      expires_at = EXCLUDED.expires_at,
      last_updated = now(),
      count = orchestrator_mitigations.count + 1,
      previous_state_json = EXCLUDED.previous_state_json,
      applied_patch_json = EXCLUDED.applied_patch_json,
      meta = EXCLUDED.meta
    `,
    [
      familyId,
      'duplicate_storm',
      expiresAt,
      JSON.stringify(prev),
      JSON.stringify(patch),
      JSON.stringify({ windowMinutes, duplicateCount })
    ]
  );

  await auditEventBare({
    eventType: 'automitigation_applied',
    severity: 'warn',
    familyId,
    statusCode: 200,
    meta: { mitigationType: 'duplicate_storm', expiresAt, duplicateCount, windowMinutes }
  });

  return { applied: true, expiresAt, patch };
}

export async function clearExpiredMitigations() {
  const res = await query(
    `
    SELECT family_id, mitigation_type, previous_state_json
    FROM orchestrator_mitigations
    WHERE active = true AND expires_at IS NOT NULL AND expires_at <= now()
    `
  );

  let cleared = 0;

  for (const r of res.rows) {
    const familyId = r.family_id;
    const mitigationType = r.mitigation_type;
    const previous = r.previous_state_json;

    const state = await orchestratorPgStore.getState(familyId);
    if (!state) continue;

    // Revert only the fields we touched; do not stomp other state.
    const next = {
      ...state,
      cooldownUntil: previous?.cooldownUntil ?? null,
      maxNotificationsPerHour: previous?.maxNotificationsPerHour ?? state.maxNotificationsPerHour,
      mitigation: null,
      updatedAt: new Date().toISOString()
    };

    await orchestratorPgStore.upsertState(next);

    await query(
      `
      UPDATE orchestrator_mitigations
      SET active = false, last_updated = now()
      WHERE family_id = $1 AND mitigation_type = $2
      `,
      [familyId, mitigationType]
    );

    await auditEventBare({
      eventType: 'automitigation_cleared',
      severity: 'info',
      familyId,
      statusCode: 200,
      meta: { mitigationType }
    });

    cleared += 1;
  }

  return { cleared };
}
