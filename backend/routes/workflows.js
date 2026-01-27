/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';

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

function resolveValue(value, ctx) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const pathValue = getPath(ctx, value);
    if (pathValue !== undefined) return pathValue;
    return interpolate(value, ctx);
  }
  return value;
}

function evaluateCondition(condition, ctx) {
  if (condition === null || condition === undefined) return true;
  if (typeof condition === 'boolean') return condition;
  if (typeof condition === 'string') return Boolean(resolveValue(condition, ctx));
  if (typeof condition !== 'object') return Boolean(condition);

  const operator = condition.op || condition.operator || condition.compare || null;
  const left = condition.path ? getPath(ctx, condition.path) : resolveValue(condition.left ?? condition.field, ctx);
  const right = resolveValue(condition.right ?? condition.value ?? condition.equals ?? condition.eq, ctx);

  const op = operator || (condition.hasOwnProperty('equals') || condition.hasOwnProperty('eq') ? 'equals' : 'truthy');
  switch (op) {
    case 'equals':
    case 'eq':
    case '==':
      return left === right;
    case 'not_equals':
    case 'neq':
    case '!=':
      return left !== right;
    case 'gt':
    case '>':
      return Number(left) > Number(right);
    case 'gte':
    case '>=':
      return Number(left) >= Number(right);
    case 'lt':
    case '<':
      return Number(left) < Number(right);
    case 'lte':
    case '<=':
      return Number(left) <= Number(right);
    case 'contains':
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === 'string') return left.includes(String(right));
      return false;
    case 'in':
      return Array.isArray(right) ? right.includes(left) : false;
    case 'truthy':
    default:
      return Boolean(left ?? right);
  }
}

function buildGraph(definition) {
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
  return { nodes, edges, byId, outgoing };
}

function nextNodeFor(currentId, graph, ctx) {
  const edges = graph.outgoing.get(currentId) || [];
  for (const edge of edges) {
    const condition = edge.condition ?? edge?.data?.condition;
    if (evaluateCondition(condition, ctx)) {
      return graph.byId.get(edge.target) || null;
    }
  }
  return null;
}

async function runWorkflow(definition, { trigger = {}, actor = {} }) {
  const execution = { trigger, steps: {}, actor };
  const graph = buildGraph(definition);
  const triggerNode = graph.nodes.find((n) => n.type === 'trigger') || graph.nodes[0];
  if (!triggerNode) return execution;

  const visited = new Set();
  let current = triggerNode;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.type === 'trigger') {
      execution.steps[current.id] = { ok: true, output: trigger };
    } else if (current.type === 'action') {
      const cfg = current?.data?.config || {};
      const actionType = cfg.type || 'noop';
      const payload = {
        entity: cfg.entity,
        fields: cfg.fields || {},
        body: cfg.body,
      };
      const input = interpolateObject(payload, execution);
      execution.steps[current.id] = {
        ok: true,
        output: { actionType, input, note: 'recorded_only' },
      };
    } else {
      execution.steps[current.id] = { ok: true, output: {} };
    }

    current = nextNodeFor(current.id, graph, execution);
  }

  return execution;
}

router.use(requireAuth);
router.use(requireTenant);

router.get('/', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
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

router.get('/:id', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
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

router.post('/', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
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

router.put('/:id', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
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

router.delete('/:id', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
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

router.get('/:id/versions', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const r = await query(
    `select v.id, v.version_number, v.created_at, v.created_by
     from workflow_definition_versions v
     join workflow_definitions w on w.id = v.workflow_id
     where v.workflow_id = $1 and w.organization_id = $2
     order by v.version_number desc`,
    [id, organizationId]
  );
  res.json({ versions: r.rows || [] });
});

router.post('/:id/rollback', requireAdmin, requireScopes('workflow:manage'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { versionId, versionNumber } = req.body || {};
  if (!versionId && !versionNumber) return res.status(400).json({ error: 'missing version' });

  const versionQuery = versionId
    ? 'select id, definition from workflow_definition_versions where id = $1'
    : 'select id, definition from workflow_definition_versions where workflow_id = $1 and version_number = $2';
  const versionParams = versionId ? [versionId] : [id, Number(versionNumber)];
  const versionResult = await query(versionQuery, versionParams);
  if (!versionResult.rows?.length) return res.status(404).json({ error: 'version_not_found' });

  const r = await query(
    `update workflow_definitions
     set definition = $3::jsonb, updated_at = now(), updated_by = $4
     where id = $1 and organization_id = $2
     returning id, name, description, is_active, school_id, created_at, updated_at`,
    [id, organizationId, JSON.stringify(versionResult.rows[0].definition), req.auth?.userId || null]
  );
  if (!r.rows?.length) return res.status(404).json({ error: 'not_found' });
  res.json({ workflow: r.rows[0] });
});

router.post('/:id/run', requireScopes('workflow:run'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { id } = req.params;
  const { trigger } = req.body || {};

  const workflowResp = await query(
    `select id, definition, is_active from workflow_definitions where id = $1 and organization_id = $2`,
    [id, organizationId]
  );
  const workflow = workflowResp.rows?.[0];
  if (!workflow?.id) return res.status(404).json({ error: 'not_found' });
  if (!workflow.is_active) return res.status(400).json({ error: 'workflow_inactive' });

  const versionResp = await query(
    `select id from workflow_definition_versions where workflow_id = $1 order by version_number desc limit 1`,
    [id]
  );
  const versionId = versionResp.rows?.[0]?.id || null;

  const actor = { id: req.auth?.userId || null, role: req.auth?.role || null };
  const execution = await runWorkflow(workflow.definition, { trigger: trigger || {}, actor });

  const now = new Date().toISOString();
  const runResp = await query(
    `insert into workflow_runs
      (workflow_id, workflow_version_id, organization_id, school_id, status, input, output, actor_id, actor_role, started_at, finished_at)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11)
     returning id`,
    [
      id,
      versionId,
      organizationId,
      schoolId || null,
      'success',
      JSON.stringify({ trigger: trigger || {} }),
      JSON.stringify(execution),
      req.auth?.userId || null,
      req.auth?.role || null,
      now,
      now,
    ]
  );

  await query(
    `insert into analytics_events
      (event_name, event_ts, organization_id, school_id, actor_id, actor_role, metadata, source)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
    [
      'workflow_run',
      now,
      organizationId,
      schoolId || null,
      req.auth?.userId || null,
      req.auth?.role || null,
      JSON.stringify({ workflow_id: id, run_id: runResp.rows?.[0]?.id || null }),
      'backend',
    ]
  );

  res.status(201).json({ runId: runResp.rows?.[0]?.id, execution });
});

export default router;
