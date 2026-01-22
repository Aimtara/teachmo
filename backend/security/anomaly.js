/* eslint-env node */
import { query } from '../db.js';
import { sendAnomalyAlerts } from '../alerts/dispatcher.js';
import { applyDuplicateStormMitigation } from '../orchestrator/mitigation.js';

/**
 * Upsert anomaly and bump counters.
 */
export async function upsertAnomaly({
  familyId,
  anomalyType,
  severity = 'warn',
  windowMinutes = 10,
  meta = {}
}) {
  const res = await query(
    `
    INSERT INTO orchestrator_anomalies
      (family_id, anomaly_type, severity, window_minutes, meta, count, first_seen, last_seen)
    VALUES
      ($1, $2, $3, $4, $5::jsonb, 1, now(), now())
    ON CONFLICT (family_id, anomaly_type) DO UPDATE SET
      severity = EXCLUDED.severity,
      window_minutes = EXCLUDED.window_minutes,
      meta = EXCLUDED.meta,
      count = orchestrator_anomalies.count + 1,
      last_seen = now()
    RETURNING family_id, anomaly_type, severity, count, window_minutes, last_seen, meta
    `,
    [familyId, anomalyType, severity, windowMinutes, JSON.stringify(meta ?? {})]
  );

  const row = res.rows[0];

  // Escalation policy: if count gets high, force severity up.
  const count = Number(row.count || 0);
  let sev = row.severity;

  // Tune these however you like:
  if (count >= 50) sev = 'error';
  else if (count >= 15 && sev === 'info') sev = 'warn';

  if (sev !== row.severity) {
    await query(
      `UPDATE orchestrator_anomalies SET severity = $3 WHERE family_id = $1 AND anomaly_type = $2`,
      [familyId, anomalyType, sev]
    );
  }

  if (anomalyType === 'repeated_duplicate_signals') {
    await applyDuplicateStormMitigation({
      familyId,
      duplicateCount: count,
      windowMinutes
    });
  }

  // 🚨 alert hooks (deduped by dispatcher)
  await sendAnomalyAlerts({
    familyId,
    anomalyType,
    severity: sev,
    meta: { ...row.meta, count, windowMinutes }
  });

  return { ...row, severity: sev };
}

/**
 * Threshold-based detector: counts recent audit events of certain types.
 * If threshold exceeded => flag an anomaly.
 */
export async function maybeFlagAnomalyFromAudit({ familyId, eventType, windowMinutes = 10 }) {
  if (!familyId) return;

  const thresholds = {
    forbidden_family: { count: 5, anomalyType: 'repeated_forbidden_access', severity: 'warn' },
    duplicate_signal: { count: 15, anomalyType: 'repeated_duplicate_signals', severity: 'info' },
    auth_invalid_token: { count: 8, anomalyType: 'repeated_invalid_tokens', severity: 'warn' }
  };

  const cfg = thresholds[eventType];
  if (!cfg) return;

  const res = await query(
    `
    SELECT COUNT(*)::int AS c
    FROM security_audit_events
    WHERE family_id = $1
      AND event_type = $2
      AND created_at >= now() - ($3 || ' minutes')::interval
    `,
    [familyId, eventType, String(windowMinutes)]
  );

  const c = res.rows?.[0]?.c ?? 0;
  if (c >= cfg.count) {
    await upsertAnomaly({
      familyId,
      anomalyType: cfg.anomalyType,
      severity: cfg.severity,
      windowMinutes,
      meta: { eventType, recentCount: c, threshold: cfg.count }
    });
  }
}

/**
 * List anomalies for a family.
 */
export async function listAnomalies(familyId, { limit = 50, offset = 0 } = {}) {
  const res = await query(
    `
    SELECT id, family_id, anomaly_type, severity, first_seen, last_seen, count, window_minutes, meta
    FROM orchestrator_anomalies
    WHERE family_id = $1
    ORDER BY last_seen DESC
    LIMIT $2 OFFSET $3
    `,
    [familyId, limit, offset]
  );

  return res.rows.map((r) => ({
    id: r.id,
    familyId: r.family_id,
    anomalyType: r.anomaly_type,
    severity: r.severity,
    firstSeen: new Date(r.first_seen).toISOString(),
    lastSeen: new Date(r.last_seen).toISOString(),
    count: r.count,
    windowMinutes: r.window_minutes,
    meta: r.meta ?? {}
  }));
}
