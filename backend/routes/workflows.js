/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

function getPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(value, ctx) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, raw) => {
    const v = getPath(ctx, raw.trim());
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

function interpolateObject(obj, ctx) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((v) => interpolateObject(v, ctx));
  if (typeof obj !== 'object') return interpolate(obj, ctx);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = interpolateObject(v, ctx);
  }
  return out;
}

function linearize(definition) {
  const nodes = Array.isArray(definition?.nodes) ? definition.nodes : [];
  const edges = Array.isArray(definition?.edges) ? definition.edges : [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map();
  for (const e of edges) {
    if (!e?.source || !e?.target) continue;
    const list = outgoing.get(e.source) || [];
    list.push(e);
    outgoing.set(e.source, list);
  }

  const trigger = nodes.find((n) => n.type === 'trigger') || nodes[0];
  if (!trigger) return [];

  const ordered = [];
  const visited = new Set();
  let cur = trigger;
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);
    ordered.push(cur);
    const outs = outgoing.get(cur.id) || [];
    cur = outs.length ? byId.get(outs[0].target) : null;
  }
  return ordered;
}

async function runWorkflow(definition, { trigger = {}, actor = {} }) {
  const execution = { trigger, steps: {}, actor };
  const nodes = linearize(definition);
  for (const node of nodes) {
    if (node.type === 'trigger') {
      execution.steps[node.id] = { ok: true, output: trigger };
      continue;
    }
    if (node.type === 'action') {
      const cfg = node?.data?.config || {};
      const actionType = cfg.type || 'noop';
      const payload = {
        entity: cfg.entity,
        fields: cfg.fields || {},
        body: cfg.body
      };
      const input = interpolateObject(payload, execution);
      execution.steps[node.id] = {
        ok: true,
        output: { actionType, input, note: 'recorded_only' }
      };
      continue;
    }
    execution.steps[node.id] = { ok: true, output: {} };
  }
  return execution;
}

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const scopeSql = schoolId
    ? 'organization_id = $1 and (school_id is null or school_id = $2)'
    : 'organization_id = $1';
  const params = schoolId ? [organizationId, schoolId] : [organizationId];

  const r = await query(
    `select id, name, description, is_active, school_id, created_at, updated_at
     from workflow_definitions
     where ${scopeSql}
     order by updated_at desc
     limit 200`,
    params
  );
  res.json({ workflows: r.rows ?? [] });
});

router.get('/:id', async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const r = await query(
    `select id, name, description, is_active, school_id, definition, created_at, updated_at
     from workflow_definitions
     where id = $1 and organization_id = $2`,
    [id, organizationId]
  );
  if (!r.rows?.length) return res.status(404).json({ error: 'not_found' });
  res.json({ workflow: r.rows[0] });
});

router.post('/', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const role = req.auth?.role || 'anonymous';
  const { name, description, definition, isActive } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'missing name' });
  if (!definition || typeof definition !== 'object') return res.status(400).json({ error: 'missing definition' });
  if (role === 'school_admin' && !schoolId) return res.status(400).json({ error: 'missing school scope' });

  const r = await query(
    `insert into workflow_definitions (organization_id, school_id, name, description, definition, is_active, created_by, updated_by)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7, $7)
     returning id, name, description, is_active, school_id, created_at, updated_at`,
    [
      organizationId,
      schoolId || null,
      name,
      description || null,
      JSON.stringify(definition),
      isActive !== undefined ? Boolean(isActive) : true,
      req.auth?.userId || null,
    ]
  );
  res.status(201).json({ workflow: r.rows?.[0] });
});

router.put('/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const role = req.auth?.role || 'anonymous';
  const restrictSchool = role === 'school_admin' && !!schoolId;
  const { id } = req.params;
  const { name, description, definition, isActive } = req.body || {};

  const sql = `update workflow_definitions
     set name = coalesce($3, name),
         description = coalesce($4, description),
         definition = coalesce($5::jsonb, definition),
         is_active = coalesce($6, is_active),
         updated_at = now(),
         updated_by = $7
     where id = $1 and organization_id = $2${restrictSchool ? ' and school_id = $8' : ''}
     returning id, name, description, is_active, school_id, created_at, updated_at`;

  const params = [
    id,
    organizationId,
    typeof name === 'string' ? name : null,
    description !== undefined ? description : null,
    definition && typeof definition === 'object' ? JSON.stringify(definition) : null,
    isActive !== undefined ? Boolean(isActive) : null,
    req.auth?.userId || null,
  ];
  if (restrictSchool) params.push(schoolId);

  const r = await query(sql, params);
  if (!r.rows?.length) return res.status(404).json({ error: 'not_found' });
  res.json({ workflow: r.rows[0] });
});

router.delete('/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const role = req.auth?.role || 'anonymous';
  const restrictSchool = role === 'school_admin' && !!schoolId;
  const { id } = req.params;
  const sql = `delete from workflow_definitions where id = $1 and organization_id = $2${restrictSchool ? ' and school_id = $3' : ''}`;
  const params = [id, organizationId];
  if (restrictSchool) params.push(schoolId);
  await query(sql, params);
  res.status(204).send();
});

router.post('/:id/run', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { id } = req.params;
  const trigger = req.body?.trigger || {};

  const wf = await query(
    `select id, definition
     from workflow_definitions
     where id = $1 and organization_id = $2`,
    [id, organizationId]
  );
  if (!wf.rows?.length) return res.status(404).json({ error: 'not_found' });

  const startedAt = new Date();
  const execution = await runWorkflow(wf.rows[0].definition, {
    trigger,
    actor: { userId: req.auth?.userId || null, role: req.auth?.role || null },
  });
  const finishedAt = new Date();

  await query(
    `insert into workflow_runs (workflow_id, organization_id, school_id, actor_id, status, started_at, finished_at, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      id,
      organizationId,
      schoolId || null,
      req.auth?.userId || null,
      'success',
      startedAt.toISOString(),
      finishedAt.toISOString(),
      JSON.stringify({ execution }),
    ]
  );

  res.json({ execution });
});

export default router;
