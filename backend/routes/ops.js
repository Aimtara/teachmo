/* eslint-env node */
// Ops router: JWT-authenticated observability + mitigation actions.
// G0 Compliance: No shared secrets. Uses Nhost JWT claims.

import express from 'express';
import { query } from '../db.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';
import { auditEvent } from '../security/audit.js';

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
    if (await tableExists('families')) {
      const sql = 'SELECT id, name, status, created_at FROM families ORDER BY created_at DESC LIMIT $1';
      const result = await query(sql, [limit]);
      return res.json({ families: result.rows || [] });
    }
    return res.json({ families: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ... (Rest of existing Ops routes: mitigations, alerts, anomalies - keep them here)

export default router;
