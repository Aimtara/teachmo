/* eslint-env node */
import { createLogger } from './utils/logger.js';
import { query } from './db.js';

const logger = createLogger('seed');

export function seedDemoData() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  logger.warn('Demo seeding is disabled for database-backed partner portal data.');
}

export async function seedOpsDemoData() {
  if (process.env.SEED_OPS_DEMO !== 'true') {
    return;
  }

  logger.info('Seeding ops demo data...');

  const familyId = 'demo-family';

  await query(
    `
    INSERT INTO families (id, name, status, meta)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      meta = EXCLUDED.meta,
      updated_at = now()
    `,
    [familyId, 'Demo Family', 'active', JSON.stringify({ region: 'us-east' })]
  );

  await query(
    `
    INSERT INTO orchestrator_daily_snapshots
      (family_id, day, signals, ingests, suppressed, duplicates, actions_created, actions_completed, forbidden_family, auth_invalid_token, auth_missing_token)
    VALUES
      ($1, current_date - interval '1 day', 120, 118, 4, 2, 40, 38, 1, 0, 0)
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
    [familyId]
  );

  await query(
    `
    INSERT INTO orchestrator_hourly_snapshots
      (family_id, hour, signals, ingests, suppressed, duplicates, actions_created, actions_completed)
    VALUES
      ($1, date_trunc('hour', now()) - interval '3 hours', 14, 14, 0, 0, 5, 5),
      ($1, date_trunc('hour', now()) - interval '2 hours', 20, 19, 1, 0, 6, 5),
      ($1, date_trunc('hour', now()) - interval '1 hours', 18, 17, 0, 1, 4, 4)
    ON CONFLICT (family_id, hour) DO UPDATE SET
      signals = EXCLUDED.signals,
      ingests = EXCLUDED.ingests,
      suppressed = EXCLUDED.suppressed,
      duplicates = EXCLUDED.duplicates,
      actions_created = EXCLUDED.actions_created,
      actions_completed = EXCLUDED.actions_completed,
      updated_at = now()
    `,
    [familyId]
  );

  await query(
    `
    INSERT INTO orchestrator_anomalies
      (family_id, anomaly_type, severity, status, count, window_minutes, meta)
    VALUES
      ($1, 'repeated_forbidden_access', 'warn', 'open', 3, 10, $2::jsonb)
    ON CONFLICT (family_id, anomaly_type) DO UPDATE SET
      severity = EXCLUDED.severity,
      status = EXCLUDED.status,
      count = EXCLUDED.count,
      last_seen = now(),
      meta = EXCLUDED.meta
    `,
    [familyId, JSON.stringify({ sample: true })]
  );

  const existingEndpoint = await query(
    `
    SELECT id
    FROM orchestrator_alert_endpoints
    WHERE family_id = $1 AND type = 'webhook' AND target = 'https://example.com/ops-webhook'
    LIMIT 1
    `,
    [familyId]
  );

  let endpointId = existingEndpoint.rows?.[0]?.id;
  if (!endpointId) {
    const endpoint = await query(
      `
      INSERT INTO orchestrator_alert_endpoints (family_id, type, target, enabled)
      VALUES ($1, 'webhook', 'https://example.com/ops-webhook', true)
      RETURNING id
      `,
      [familyId]
    );
    endpointId = endpoint.rows?.[0]?.id;
  }
  if (endpointId) {
    await query(
      `
      INSERT INTO orchestrator_alert_deliveries
        (endpoint_id, family_id, anomaly_type, severity, dedupe_key, status, response_code, response_body, payload_json)
      VALUES
        ($1, $2, 'ops_test_alert', 'warn', $3, 'sent', 200, 'ok', $4::jsonb)
      ON CONFLICT (dedupe_key) DO NOTHING
      `,
      [endpointId, familyId, `seed-${familyId}-alert`, JSON.stringify({ seeded: true })]
    );
  }

  await query(
    `
    INSERT INTO orchestrator_mitigations
      (family_id, mitigation_type, active, activated_at, last_updated, count, meta)
    VALUES ($1, 'duplicate_storm', true, now(), now(), 1, $2::jsonb)
    ON CONFLICT (family_id, mitigation_type) DO UPDATE SET
      active = EXCLUDED.active,
      activated_at = EXCLUDED.activated_at,
      last_updated = now(),
      count = orchestrator_mitigations.count + 1,
      meta = EXCLUDED.meta
    `,
    [familyId, JSON.stringify({ mode: 'duplicate_suppression', maxPerHour: 0 })]
  );

  logger.info('Ops demo data seeded.');
}
