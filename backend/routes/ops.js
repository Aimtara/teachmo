/* eslint-env node */
// Ops router: read-only observability + limited lifecycle actions for anomalies/mitigations.
//
// This file is intentionally small and boring: it exists because a previous version of this router
// regressed into duplicated/garbled blocks. Keep it minimal and keep it testable.

import express from 'express';
import { query } from '../db.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';
import { auditEvent } from '../security/audit.js';

const router = express.Router();

const MAX_LIMIT = 100;

function clampLimit(value, fallback = 25) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

function opsActor(req) {
  const headerActor = req.get('x-ops-actor');
  if (headerActor && String(headerActor).trim()) return String(headerActor).trim().slice(0, 200);
  const authUser = req.auth?.userId;
  if (authUser) return String(authUser).slice(0, 200);
  return 'ops_admin';
}

const existsCache = new Map();
async function tableExists(tableName) {
  if (existsCache.has(tableName)) return existsCache.get(tableName);
  const res = await query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
  const ok = Boolean(res.rows?.[0]?.reg);
  existsCache.set(tableName, ok);
  return ok;
}

const columnsCache = new Map();
async function tableColumns(tableName) {
  if (columnsCache.has(tableName)) return columnsCache.get(tableName);
  const res = await query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName]
  );
  const cols = new Set((res.rows || []).map((r) => r.column_name));
  columnsCache.set(tableName, cols);
  return cols;
}

async function hasColumns(tableName, columns) {
  const cols = await tableColumns(tableName);
  return columns.every((c) => cols.has(c));
}

function requireOpsAuth(req, res, next) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized_missing_token' });
  }

  const role = req.auth?.role;
  const isSystemAdmin = role === 'system_admin';
  if (!isSystemAdmin) {
    console.warn(`[Security] Unauthorized ops attempt by user ${userId}`);
    return res.status(403).json({ error: 'forbidden_insufficient_permissions' });
  }

  return next();
}

router.use(requireOpsAuth);

// --- Families --------------------------------------------------------------
router.get('/families', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = clampLimit(req.query.limit, 25);

    // Prefer canonical families table if present.
    if (await tableExists('families')) {
      const params = [];
      let where = '';
      if (q) {
        params.push(`%${q}%`);
        where = `WHERE id ILIKE $1 OR name ILIKE $1`;
      }
      params.push(limit);

      const result = await query(
        `
        SELECT id, name, status, created_at, updated_at
        FROM families
        ${where}
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT $${params.length}
        `,
        params
      );
      return res.json({ families: result.rows || [] });
    }

    // Fallback: derive from family_memberships.
    if (await tableExists('family_memberships')) {
      const params = [];
      let where = '';
      if (q) {
        params.push(`%${q}%`);
        where = `WHERE family_id ILIKE $1`;
      }
      params.push(limit);

      const result = await query(
        `
        SELECT
          family_id AS id,
          NULL::text AS name,
          'active'::text AS status,
          MIN(created_at) AS created_at,
          MAX(created_at) AS updated_at
        FROM family_memberships
        ${where}
        GROUP BY family_id
        ORDER BY MAX(created_at) DESC
        LIMIT $${params.length}
        `,
        params
      );

      return res.json({ families: result.rows || [] });
    }

    return res.json({ families: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

// --- Health --------------------------------------------------------------
router.get('/health', (req, res) => {
  res.json({ status: 'operable', actor: req.auth?.userId || null });
});

// --- Health ---------------------------------------------------------------
// Minimal shape expected by the OpsOrchestrator UI.
router.get('/families/:familyId/health', async (req, res) => {
  try {
    const { familyId } = req.params;

    const dailyRes = (await tableExists('orchestrator_daily_snapshots'))
      ? await query(
          `
          SELECT *
          FROM orchestrator_daily_snapshots
          WHERE family_id = $1
          ORDER BY day DESC
          LIMIT 1
          `,
          [familyId]
        )
      : { rows: [] };

    const hourlyRes = (await tableExists('orchestrator_hourly_snapshots'))
      ? await query(
          `
          SELECT *
          FROM orchestrator_hourly_snapshots
          WHERE family_id = $1
            AND hour >= date_trunc('day', now())
            AND hour < date_trunc('day', now()) + interval '1 day'
          ORDER BY hour ASC
          `,
          [familyId]
        )
      : { rows: [] };

    return res.json({ daily: dailyRes.rows?.[0] || null, hourly: hourlyRes.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

// --- Anomalies ------------------------------------------------------------
async function writeAnomalyAction({ familyId, anomalyType, action, note, actor, meta } = {}) {
  if (!(await tableExists('orchestrator_anomaly_actions'))) return;

  const cols = await tableColumns('orchestrator_anomaly_actions');
  const safeNote = typeof note === 'string' ? note.slice(0, 2000) : null;
  const safeActor = actor ? String(actor).slice(0, 200) : null;

  const insertCols = [];
  const values = [];
  const params = [];
  const push = (col, val) => {
    insertCols.push(col);
    values.push(`$${values.length + 1}`);
    params.push(val);
  };

  if (cols.has('family_id')) push('family_id', familyId);
  if (cols.has('anomaly_type')) push('anomaly_type', anomalyType);
  if (cols.has('action')) push('action', action);
  if (cols.has('actor')) push('actor', safeActor);
  if (cols.has('note')) push('note', safeNote);
  if (cols.has('meta')) push('meta', JSON.stringify(meta ?? {}));

  if (insertCols.length === 0) return;

  await query(
    `
    INSERT INTO orchestrator_anomaly_actions (${insertCols.join(', ')})
    VALUES (${values.join(', ')})
    `,
    params
  );
}

async function updateAnomalyStatus({ familyId, anomalyType, status, note, actor }) {
  const cols = await tableColumns('orchestrator_anomalies');
  const safeNote = typeof note === 'string' ? note.slice(0, 2000) : null;
  const safeActor = actor ? String(actor).slice(0, 200) : null;

  // Build UPDATE with only columns that exist.
  const sets = [];
  const params = [familyId, anomalyType];
  const addSet = (sql, value) => {
    params.push(value);
    sets.push(sql.replace('$v', `$${params.length}`));
  };

  if (cols.has('status')) addSet(`status = $v`, status);
  if (cols.has('updated_at')) sets.push('updated_at = now()');

  if (cols.has('status_note') && safeNote) addSet(`status_note = COALESCE($v, status_note)`, safeNote);

  if (status === 'acknowledged') {
    if (cols.has('acknowledged_at')) sets.push('acknowledged_at = now()');
    if (cols.has('acknowledged_by')) addSet(`acknowledged_by = $v`, safeActor);
  }

  if (status === 'closed') {
    if (cols.has('closed_at')) sets.push('closed_at = now()');
    if (cols.has('closed_by')) addSet(`closed_by = $v`, safeActor);
  }

  if (status === 'open') {
    // Reopen clears lifecycle fields where available.
    if (cols.has('acknowledged_at')) sets.push('acknowledged_at = NULL');
    if (cols.has('acknowledged_by')) sets.push('acknowledged_by = NULL');
    if (cols.has('closed_at')) sets.push('closed_at = NULL');
    if (cols.has('closed_by')) sets.push('closed_by = NULL');
  }

  if (sets.length === 0) {
    // If the schema doesn't support lifecycle columns yet, still return the row.
    const res = await query(
      `
      SELECT *
      FROM orchestrator_anomalies
      WHERE family_id = $1 AND anomaly_type = $2
      LIMIT 1
      `,
      [familyId, anomalyType]
    );
    return res.rows?.[0] || null;
  }

  const res = await query(
    `
    UPDATE orchestrator_anomalies
    SET ${sets.join(', ')}
    WHERE family_id = $1 AND anomaly_type = $2
    RETURNING *
    `,
    params
  );
  return res.rows?.[0] || null;
}

router.get('/families/:familyId/anomalies', async (req, res) => {
  try {
    const { familyId } = req.params;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const limit = clampLimit(req.query.limit, 50);

    const params = [familyId];
    let where = 'WHERE family_id = $1';

    if (status && status !== 'all') {
      if (await hasColumns('orchestrator_anomalies', ['status'])) {
        params.push(status);
        where += ` AND status = $${params.length}`;
      }
    }
    params.push(limit);

    const out = await query(
      `
      SELECT *
      FROM orchestrator_anomalies
      ${where}
      ORDER BY last_seen DESC
      LIMIT $${params.length}
      `,
      params
    );

    return res.json({ anomalies: out.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/ack', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note : null;
    const actor = opsActor(req);

    const anomaly = await updateAnomalyStatus({ familyId, anomalyType, status: 'acknowledged', note, actor });
    if (!anomaly) return res.status(404).json({ error: 'anomaly_not_found' });
    await writeAnomalyAction({ familyId, anomalyType, action: 'ack', note, actor });
    await auditEvent(req, { eventType: 'ops_anomaly_ack', severity: 'info', familyId, meta: { anomalyType, note } });

    return res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/close', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note : null;
    const actor = opsActor(req);

    const anomaly = await updateAnomalyStatus({ familyId, anomalyType, status: 'closed', note, actor });
    if (!anomaly) return res.status(404).json({ error: 'anomaly_not_found' });
    await writeAnomalyAction({ familyId, anomalyType, action: 'close', note, actor });
    await auditEvent(req, { eventType: 'ops_anomaly_close', severity: 'info', familyId, meta: { anomalyType, note } });

    return res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/reopen', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note : null;
    const actor = opsActor(req);

    const anomaly = await updateAnomalyStatus({ familyId, anomalyType, status: 'open', note, actor });
    if (!anomaly) return res.status(404).json({ error: 'anomaly_not_found' });
    await writeAnomalyAction({ familyId, anomalyType, action: 'reopen', note, actor });
    await auditEvent(req, { eventType: 'ops_anomaly_reopen', severity: 'info', familyId, meta: { anomalyType, note } });

    return res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

// --- Alerts ---------------------------------------------------------------
router.get('/families/:familyId/alerts', async (req, res) => {
  try {
    const { familyId } = req.params;
    const limit = clampLimit(req.query.limit, 50);

    if (!(await tableExists('orchestrator_alert_deliveries'))) {
      return res.json({ alerts: [], deliveries: [] });
    }

    const deliveries = await query(
      `
      SELECT d.*, e.type as endpoint_type, e.target as endpoint_target
      FROM orchestrator_alert_deliveries d
      LEFT JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
      WHERE d.family_id = $1
      ORDER BY d.created_at DESC
      LIMIT $2
      `,
      [familyId, limit]
    );

    // Aggregated view (for the table UI).
    const alerts = (await tableExists('orchestrator_alert_endpoints'))
      ? await query(
          `
          SELECT
            e.id AS endpoint_id,
            e.type AS endpoint_type,
            e.target AS endpoint_target,
            MAX(d.created_at) AS last_delivered_at,
            COUNT(*)::int AS count,
            (ARRAY_AGG(d.status ORDER BY d.created_at DESC))[1] AS status,
            (ARRAY_AGG(d.severity ORDER BY d.created_at DESC))[1] AS severity
          FROM orchestrator_alert_deliveries d
          JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
          WHERE d.family_id = $1
          GROUP BY e.id, e.type, e.target
          ORDER BY MAX(d.created_at) DESC
          LIMIT $2
          `,
          [familyId, limit]
        )
      : { rows: [] };

    return res.json({ alerts: alerts.rows || [], deliveries: deliveries.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

// --- Mitigations ----------------------------------------------------------
router.get('/families/:familyId/mitigations', async (req, res) => {
  try {
    const { familyId } = req.params;

    if (!(await tableExists('orchestrator_mitigations'))) {
      return res.json({ mitigations: [] });
    }

    const out = await query(
      `
      SELECT family_id, mitigation_type, active, activated_at, expires_at, last_updated, count,
             previous_state_json, applied_patch_json, meta
      FROM orchestrator_mitigations
      WHERE family_id = $1
      ORDER BY last_updated DESC NULLS LAST
      `,
      [familyId]
    );

    const mitigations = (out.rows || []).map((r) => {
      const activatedAt = r.activated_at ? new Date(r.activated_at).toISOString() : null;
      const expiresAt = r.expires_at ? new Date(r.expires_at).toISOString() : null;
      const updatedAt = r.last_updated ? new Date(r.last_updated).toISOString() : null;

      return {
        type: r.mitigation_type,
        active: r.active,
        updated_at: updatedAt,
        activated_at: activatedAt,
        expires_at: expiresAt,
        params: {
          ...(r.meta ?? {}),
          count: r.count ?? 0,
          activatedAt,
          expiresAt,
          patch: r.applied_patch_json ?? null
        }
      };
    });

    return res.json({ mitigations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

async function forceClearMitigation({ familyId, mitigationType, note, actor }) {
  if (!(await tableExists('orchestrator_mitigations'))) return { cleared: false, reason: 'missing_table' };

  const rowRes = await query(
    `
    SELECT family_id, mitigation_type, active, previous_state_json, applied_patch_json, meta
    FROM orchestrator_mitigations
    WHERE family_id = $1 AND mitigation_type = $2
    LIMIT 1
    `,
    [familyId, mitigationType]
  );

  const row = rowRes.rows?.[0];
  if (!row) return { cleared: false, reason: 'not_found' };

  // Attempt to revert state if we have a previous snapshot.
  const prev = row.previous_state_json;
  if (prev) {
    const state = await orchestratorPgStore.getState(familyId);
    if (state) {
      const next = {
        ...state,
        updatedAt: new Date().toISOString(),
        zone: prev.zone ?? state.zone,
        tension: typeof prev.tension === 'number' ? prev.tension : state.tension,
        slack: typeof prev.slack === 'number' ? prev.slack : state.slack,
        cooldownUntil: prev.cooldownUntil ?? state.cooldownUntil,
        mitigation: null
      };
      await orchestratorPgStore.upsertState(next);
    }
  }

  const meta = {
    ...(row.meta ?? {}),
    clearedAt: new Date().toISOString(),
    clearedBy: actor,
    note: typeof note === 'string' ? note.slice(0, 2000) : null
  };

  await query(
    `
    UPDATE orchestrator_mitigations
    SET active = false,
        last_updated = now(),
        meta = $3::jsonb
    WHERE family_id = $1 AND mitigation_type = $2
    `,
    [familyId, mitigationType, JSON.stringify(meta)]
  );

  return { cleared: true, mitigationType };
}

router.post('/families/:familyId/mitigations/:mitigationType/clear', async (req, res) => {
  try {
    const { familyId, mitigationType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note : null;
    const actor = opsActor(req);

    const result = await forceClearMitigation({ familyId, mitigationType, note, actor });
    if (!result.cleared && result.reason === 'not_found') return res.status(404).json({ error: 'mitigation_not_found' });

    await auditEvent(req, {
      eventType: 'ops_mitigation_force_clear',
      severity: 'warn',
      familyId,
      meta: { mitigationType, note }
    });

    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

// --- Timeline -------------------------------------------------------------
router.get('/families/:familyId/timeline', async (req, res) => {
  try {
    const { familyId } = req.params;
    const hours = Math.max(1, Math.min(168, Number(req.query.hours) || 48));
    const sinceExpr = `now() - (${hours} || ' hours')::interval`;

    const hourlyRows = (await tableExists('orchestrator_hourly_snapshots'))
      ? (
          await query(
            `
            SELECT *
            FROM orchestrator_hourly_snapshots
            WHERE family_id = $1 AND hour >= ${sinceExpr}
            ORDER BY hour ASC
            `,
            [familyId]
          )
        ).rows || []
      : [];

    const events = [];

    if (await tableExists('orchestrator_anomaly_actions')) {
      const actions = await query(
        `
        SELECT *
        FROM orchestrator_anomaly_actions
        WHERE family_id = $1 AND created_at >= ${sinceExpr}
        ORDER BY created_at DESC
        `,
        [familyId]
      );
      (actions.rows || []).forEach((r) => {
        events.push({
          event_type: 'anomaly_action',
          created_at: r.created_at,
          anomaly_type: r.anomaly_type,
          action: r.action,
          actor: r.actor,
          note: r.note,
          meta: r.meta ?? {}
        });
      });
    }

    if (await tableExists('orchestrator_alert_deliveries')) {
      const deliveries = await query(
        `
        SELECT d.*, e.type as endpoint_type, e.target as endpoint_target
        FROM orchestrator_alert_deliveries d
        LEFT JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
        WHERE d.family_id = $1 AND d.created_at >= ${sinceExpr}
        ORDER BY d.created_at DESC
        `,
        [familyId]
      );
      (deliveries.rows || []).forEach((r) => {
        events.push({
          event_type: 'alert_delivery',
          created_at: r.created_at,
          anomaly_type: r.anomaly_type,
          severity: r.severity,
          status: r.status,
          response_code: r.response_code,
          endpoint_type: r.endpoint_type,
          endpoint_target: r.endpoint_target,
          meta: r.payload_json ?? {}
        });
      });
    }

    if (await tableExists('orchestrator_mitigations')) {
      const mitigations = await query(
        `
        SELECT *
        FROM orchestrator_mitigations
        WHERE family_id = $1 AND last_updated >= ${sinceExpr}
        ORDER BY last_updated DESC
        `,
        [familyId]
      );
      (mitigations.rows || []).forEach((r) => {
        events.push({
          event_type: 'mitigation_change',
          created_at: r.last_updated,
          mitigation_type: r.mitigation_type,
          active: r.active,
          status: r.active ? 'active' : 'inactive',
          meta: r.meta ?? {}
        });
      });
    }

    return res.json({ hourlyRows, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

export default router;
