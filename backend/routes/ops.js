/* eslint-env node */
// Ops router: JWT-authenticated observability + mitigation actions.
// G0/G3 Compliance: No shared secrets. Uses Nhost JWT claims.

import express from 'express';
import { query } from '../db.js';
import { getFamilyHealth } from '../orchestrator/health.js';
import { listAnomalies } from '../security/anomaly.js';
import { getActiveMitigation } from '../orchestrator/mitigation.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';
import { auditEventBare } from '../security/audit.js';

const router = express.Router();
const MAX_LIMIT = 100;

// --- Auth Middleware (G0 Compliance) ---
function requireOpsAuth(req, res, next) {
  // 1. Must be authenticated (attachAuthContext middleware runs before this)
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'unauthorized_missing_token' });
  }

  // 2. Must have system_admin role
  // This relies on the 'role' extracted from the JWT in middleware/auth.js
  const role = req.auth.role;
  const isSystemAdmin = role === 'system_admin';

  // Strict deny if not admin
  if (!isSystemAdmin) {
    console.warn(`[Security] Unauthorized ops attempt by user ${req.auth.userId}`);
    return res.status(403).json({ error: 'forbidden_insufficient_permissions' });
  }

  next();
}

// Apply auth to all ops routes
router.use(requireOpsAuth);

// --- Helpers ---
function clampLimit(value, fallback = 25) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

// Reuse existing table helpers
const existsCache = new Map();
async function tableExists(tableName) {
  if (existsCache.has(tableName)) return existsCache.get(tableName);
  const res = await query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
  const ok = Boolean(res.rows?.[0]?.reg);
  existsCache.set(tableName, ok);
  return ok;
}

// --- Routes ---
router.get('/health', (req, res) => {
  res.json({ status: 'operable', actor: req.auth.userId });
});

router.get('/families', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit, 25);

    // Basic query logic preserved from original
    let sql = 'SELECT * FROM auth.users LIMIT $1';
    let params = [limit];

    // Check if real families table exists (it should in production)
    if (await tableExists('families')) {
      sql = 'SELECT id, name, status, created_at FROM families ORDER BY created_at DESC LIMIT $1';
    }

    const result = await query(sql, params);
    return res.json({ families: result.rows || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Family Health Endpoint ---
router.get('/families/:familyId/health', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { days, hourly, hourlyHours } = req.query;

    const options = {
      days: days ? Number(days) : 14,
      hourly: hourly === 'true',
      hourlyHours: hourlyHours ? Number(hourlyHours) : 24
    };

    const health = await getFamilyHealth(familyId, options);
    
    // Transform response to match expected API shape
    const response = {
      ...health,
      daily: health.series || null,
      hourly: health.hourly || []
    };
    
    return res.json(response);
  } catch (err) {
    console.error('[Ops] Error fetching family health:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Anomalies Endpoints ---
router.get('/families/:familyId/anomalies', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    const options = {
      limit: clampLimit(limit, 50),
      offset: Math.max(0, Number(offset) || 0)
    };

    // Get anomalies from database
    const anomalies = await listAnomalies(familyId, options);

    // Filter by status if requested
    let filtered = anomalies;
    if (status && status !== 'all') {
      // Status filtering: 'open' vs other statuses
      // For now, all anomalies from listAnomalies are considered 'open'
      // unless they have been acknowledged/closed
      filtered = anomalies;
    }

    return res.json({ anomalies: filtered });
  } catch (err) {
    console.error('[Ops] Error listing anomalies:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/ack', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const { note } = req.body;

    // Update anomaly status in database
    await query(
      `UPDATE orchestrator_anomalies 
       SET meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{status}', '"acknowledged"', true),
           meta = jsonb_set(meta, '{acknowledgedAt}', to_jsonb(now()::text), true),
           meta = jsonb_set(meta, '{acknowledgedBy}', to_jsonb($3::text), true),
           meta = jsonb_set(meta, '{note}', to_jsonb($4::text), true)
       WHERE family_id = $1 AND anomaly_type = $2`,
      [familyId, anomalyType, req.auth.userId, note || '']
    );

    await auditEventBare({
      eventType: 'anomaly_acknowledged',
      severity: 'info',
      userId: req.auth.userId,
      familyId,
      statusCode: 200,
      meta: { anomalyType, note }
    });

    return res.json({ success: true, message: 'Anomaly acknowledged' });
  } catch (err) {
    console.error('[Ops] Error acknowledging anomaly:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/close', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const { note } = req.body;

    // Update anomaly status in database
    await query(
      `UPDATE orchestrator_anomalies 
       SET meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{status}', '"closed"', true),
           meta = jsonb_set(meta, '{closedAt}', to_jsonb(now()::text), true),
           meta = jsonb_set(meta, '{closedBy}', to_jsonb($3::text), true),
           meta = jsonb_set(meta, '{closeNote}', to_jsonb($4::text), true)
       WHERE family_id = $1 AND anomaly_type = $2`,
      [familyId, anomalyType, req.auth.userId, note || '']
    );

    await auditEventBare({
      eventType: 'anomaly_closed',
      severity: 'info',
      userId: req.auth.userId,
      familyId,
      statusCode: 200,
      meta: { anomalyType, note }
    });

    return res.json({ success: true, message: 'Anomaly closed' });
  } catch (err) {
    console.error('[Ops] Error closing anomaly:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/reopen', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const { note } = req.body;

    // Update anomaly status in database
    await query(
      `UPDATE orchestrator_anomalies 
       SET meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{status}', '"open"', true),
           meta = jsonb_set(meta, '{reopenedAt}', to_jsonb(now()::text), true),
           meta = jsonb_set(meta, '{reopenedBy}', to_jsonb($3::text), true),
           meta = jsonb_set(meta, '{reopenNote}', to_jsonb($4::text), true)
       WHERE family_id = $1 AND anomaly_type = $2`,
      [familyId, anomalyType, req.auth.userId, note || '']
    );

    await auditEventBare({
      eventType: 'anomaly_reopened',
      severity: 'info',
      userId: req.auth.userId,
      familyId,
      statusCode: 200,
      meta: { anomalyType, note }
    });

    return res.json({ success: true, message: 'Anomaly reopened' });
  } catch (err) {
    console.error('[Ops] Error reopening anomaly:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Alerts Endpoint ---
router.get('/families/:familyId/alerts', async (req, res) => {
  try {
    const { familyId } = req.params;
    const limit = clampLimit(req.query.limit, 25);

    // Query recent alerts/notifications for this family
    const result = await query(
      `SELECT id, family_id, alert_type, severity, message, created_at, metadata
       FROM orchestrator_alerts
       WHERE family_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [familyId, limit]
    );

    const alerts = result.rows.map((r) => ({
      id: r.id,
      familyId: r.family_id,
      alertType: r.alert_type,
      severity: r.severity,
      message: r.message,
      createdAt: new Date(r.created_at).toISOString(),
      metadata: r.metadata || {}
    }));

    return res.json({ alerts });
  } catch (err) {
    console.error('[Ops] Error fetching alerts:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Mitigations Endpoints ---
router.get('/families/:familyId/mitigations', async (req, res) => {
  try {
    const { familyId } = req.params;

    // Query active mitigations for this family
    const result = await query(
      `SELECT mitigation_type, active, activated_at, expires_at, meta, count
       FROM orchestrator_mitigations
       WHERE family_id = $1
       ORDER BY activated_at DESC`,
      [familyId]
    );

    const mitigations = result.rows.map((r) => ({
      mitigationType: r.mitigation_type,
      active: r.active,
      activatedAt: r.activated_at ? new Date(r.activated_at).toISOString() : null,
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      meta: r.meta || {},
      count: r.count || 0
    }));

    return res.json({ mitigations });
  } catch (err) {
    console.error('[Ops] Error fetching mitigations:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/families/:familyId/mitigations/:mitigationType/clear', async (req, res) => {
  try {
    const { familyId, mitigationType } = req.params;
    const { note } = req.body;

    // Get current mitigation to restore previous state
    const mitigation = await getActiveMitigation(familyId, mitigationType);
    if (!mitigation || !mitigation.active) {
      return res.status(404).json({ error: 'No active mitigation found' });
    }

    // Restore previous state
    const state = await orchestratorPgStore.getState(familyId);
    if (state && mitigation.previous) {
      const next = {
        ...state,
        cooldownUntil: mitigation.previous.cooldownUntil ?? null,
        maxNotificationsPerHour: mitigation.previous.maxNotificationsPerHour ?? state.maxNotificationsPerHour,
        mitigation: null,
        updatedAt: new Date().toISOString()
      };
      await orchestratorPgStore.upsertState(next);
    }

    // Mark mitigation as inactive
    await query(
      `UPDATE orchestrator_mitigations
       SET active = false, last_updated = now(),
           meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{clearedBy}', to_jsonb($3::text), true),
           meta = jsonb_set(meta, '{clearedAt}', to_jsonb(now()::text), true),
           meta = jsonb_set(meta, '{clearNote}', to_jsonb($4::text), true)
       WHERE family_id = $1 AND mitigation_type = $2`,
      [familyId, mitigationType, req.auth.userId, note || '']
    );

    await auditEventBare({
      eventType: 'mitigation_cleared',
      severity: 'info',
      userId: req.auth.userId,
      familyId,
      statusCode: 200,
      meta: { mitigationType, note }
    });

    return res.json({ success: true, message: 'Mitigation cleared' });
  } catch (err) {
    console.error('[Ops] Error clearing mitigation:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Timeline Endpoint ---
router.get('/families/:familyId/timeline', async (req, res) => {
  try {
    const { familyId } = req.params;
    const hours = Math.max(1, Math.min(168, Number(req.query.hours) || 48));

    // Query orchestrator decision traces and audit events
    const [tracesResult, auditResult] = await Promise.all([
      query(
        `SELECT id, trigger_type, created_at, signal_type, suppressed_reason, action_id, meta
         FROM orchestrator_decision_traces
         WHERE family_id = $1 AND created_at >= now() - ($2 || ' hours')::interval
         ORDER BY created_at DESC
         LIMIT 500`,
        [familyId, String(hours)]
      ),
      query(
        `SELECT id, event_type, severity, created_at, user_id, meta
         FROM security_audit_events
         WHERE family_id = $1 AND created_at >= now() - ($2 || ' hours')::interval
         ORDER BY created_at DESC
         LIMIT 500`,
        [familyId, String(hours)]
      )
    ]);

    const traces = tracesResult.rows.map((r) => ({
      type: 'trace',
      id: r.id,
      triggerType: r.trigger_type,
      timestamp: new Date(r.created_at).toISOString(),
      signalType: r.signal_type,
      suppressedReason: r.suppressed_reason,
      actionId: r.action_id,
      meta: r.meta || {}
    }));

    const auditEvents = auditResult.rows.map((r) => ({
      type: 'audit',
      id: r.id,
      eventType: r.event_type,
      severity: r.severity,
      timestamp: new Date(r.created_at).toISOString(),
      userId: r.user_id,
      meta: r.meta || {}
    }));

    // Merge and sort by timestamp
    const timeline = [...traces, ...auditEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return res.json({ timeline, hours });
  } catch (err) {
    console.error('[Ops] Error fetching timeline:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
