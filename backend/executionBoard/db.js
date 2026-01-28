/* eslint-env node */

import { query } from '../db.js';
import { SEED_DEPENDENCIES, SEED_EPICS, SEED_GATES, SEED_SLICES } from './seedData.js';

function nowIso() {
  return new Date().toISOString();
}

function normalizeDoneStatus(status = '') {
  const s = String(status).toLowerCase();
  return s === 'done' || s === 'completed' || s === 'complete';
}

export async function ensureExecutionBoardTables() {
  // Core data
  await query(`
    CREATE TABLE IF NOT EXISTS execution_epics (
      id TEXT PRIMARY KEY,
      workstream TEXT NOT NULL,
      tag TEXT NOT NULL,
      rail_segment TEXT NOT NULL,
      owner_role TEXT,
      gates JSONB,
      status TEXT NOT NULL DEFAULT 'Backlog',
      dod TEXT,
      notes TEXT,
      rail_priority BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS execution_gates (
      gate TEXT PRIMARY KEY,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      checklist JSONB,
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS execution_slices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Backlog',
      owner_role TEXT,
      gate TEXT,
      primary_epic_id TEXT,
      summary TEXT,
      acceptance TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS execution_dependencies (
      id BIGSERIAL PRIMARY KEY,
      from_kind TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_kind TEXT NOT NULL,
      to_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'blocks',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(from_kind, from_id, to_kind, to_id, relation)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS execution_audit (
      id BIGSERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT,
      before JSONB,
      after JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS execution_orchestrator_actions (
      id BIGSERIAL PRIMARY KEY,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      requested_by TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      payload JSONB,
      result JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function seedExecutionBoardIfEmpty() {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM execution_epics');
  if ((rows?.[0]?.count ?? 0) > 0) return;

  for (const gate of SEED_GATES) {
    const { status, progress } = computeGateStatus(gate.checklist);
    await query(
      `INSERT INTO execution_gates (gate, purpose, status, checklist, progress)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (gate) DO UPDATE SET purpose = EXCLUDED.purpose, status = EXCLUDED.status, checklist = EXCLUDED.checklist, progress = EXCLUDED.progress, updated_at = NOW()`,
      [gate.gate, gate.purpose, status, JSON.stringify(gate.checklist ?? []), progress]
    );
  }

  for (const epic of SEED_EPICS) {
    await query(
      `INSERT INTO execution_epics (id, workstream, tag, rail_segment, owner_role, gates, status, dod, notes, rail_priority)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET workstream = EXCLUDED.workstream, tag = EXCLUDED.tag, rail_segment = EXCLUDED.rail_segment, owner_role = EXCLUDED.owner_role, gates = EXCLUDED.gates, status = EXCLUDED.status, dod = EXCLUDED.dod, notes = EXCLUDED.notes, rail_priority = EXCLUDED.rail_priority, updated_at = NOW()`,
      [
        epic.id,
        epic.workstream,
        epic.tag,
        epic.railSegment,
        epic.ownerRole ?? null,
        JSON.stringify(epic.gates ?? []),
        epic.status ?? 'Backlog',
        epic.dod ?? null,
        epic.notes ?? null,
        Boolean(epic.railPriority)
      ]
    );
  }

  for (const slice of SEED_SLICES) {
    await query(
      `INSERT INTO execution_slices (id, name, status, owner_role, gate, primary_epic_id, summary, acceptance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, owner_role = EXCLUDED.owner_role, gate = EXCLUDED.gate, primary_epic_id = EXCLUDED.primary_epic_id, summary = EXCLUDED.summary, acceptance = EXCLUDED.acceptance, updated_at = NOW()`,
      [
        slice.id,
        slice.name,
        slice.status ?? 'Backlog',
        slice.ownerRole ?? null,
        slice.gate ?? null,
        slice.primaryEpicId ?? null,
        slice.summary ?? null,
        slice.acceptance ?? null
      ]
    );
  }

  for (const dep of SEED_DEPENDENCIES) {
    await query(
      `INSERT INTO execution_dependencies (from_kind, from_id, to_kind, to_id, relation)
       VALUES ($1,$2,$3,$4,'blocks')
       ON CONFLICT (from_kind, from_id, to_kind, to_id, relation) DO NOTHING`,
      [dep.fromKind, dep.fromId, dep.toKind, dep.toId]
    );
  }
}

export function computeGateStatus(checklist = []) {
  const items = Array.isArray(checklist) ? checklist : [];
  const total = items.length;
  const doneCount = items.filter((i) => Boolean(i?.done)).length;
  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  let status = 'Not Started';
  if (doneCount === 0) status = 'Not Started';
  else if (doneCount < total) status = 'In Progress';
  else status = 'Done';

  return { status, progress };
}

export async function getExecutionBoard() {
  const [gatesRes, epicsRes, slicesRes, depsRes] = await Promise.all([
    query('SELECT * FROM execution_gates ORDER BY gate ASC'),
    query('SELECT * FROM execution_epics ORDER BY id ASC'),
    query('SELECT * FROM execution_slices ORDER BY id ASC'),
    query('SELECT * FROM execution_dependencies ORDER BY id ASC')
  ]);

  const gates = gatesRes.rows.map((g) => ({
    gate: g.gate,
    purpose: g.purpose,
    status: g.status,
    progress: g.progress,
    checklist: g.checklist ?? [],
    updatedAt: g.updated_at
  }));

  const epics = epicsRes.rows.map((e) => ({
    id: e.id,
    workstream: e.workstream,
    tag: e.tag,
    railSegment: e.rail_segment,
    ownerRole: e.owner_role,
    gates: e.gates ?? [],
    status: e.status,
    dod: e.dod,
    notes: e.notes,
    railPriority: e.rail_priority,
    updatedAt: e.updated_at
  }));

  const slices = slicesRes.rows.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    ownerRole: s.owner_role,
    gate: s.gate,
    primaryEpicId: s.primary_epic_id,
    summary: s.summary,
    acceptance: s.acceptance,
    updatedAt: s.updated_at
  }));

  const dependencies = depsRes.rows.map((d) => ({
    id: d.id,
    fromKind: d.from_kind,
    fromId: d.from_id,
    toKind: d.to_kind,
    toId: d.to_id,
    relation: d.relation,
    createdAt: d.created_at
  }));

  // Compute blocked flags for epics.
  const epicStatus = new Map(epics.map((e) => [e.id, e.status]));
  const blockersByEpic = new Map();

  dependencies
    .filter((d) => d.relation === 'blocks' && d.toKind === 'epic')
    .forEach((d) => {
      const list = blockersByEpic.get(d.toId) ?? [];
      list.push(d);
      blockersByEpic.set(d.toId, list);
    });

  const epicsWithBlocked = epics.map((e) => {
    const blockers = blockersByEpic.get(e.id) ?? [];
    const activeBlockers = blockers.filter((b) => {
      if (b.fromKind !== 'epic') return true; // slices are treated as blockers unless removed.
      const status = epicStatus.get(b.fromId);
      return !normalizeDoneStatus(status);
    });

    return {
      ...e,
      blocked: activeBlockers.length > 0,
      blockers: activeBlockers.map((b) => `${b.fromKind}:${b.fromId}`)
    };
  });

  // Auto-update gates if checklist changed (idempotent).
  for (const g of gates) {
    const { status, progress } = computeGateStatus(g.checklist);
    if (status !== g.status || progress !== g.progress) {
      await query(
        'UPDATE execution_gates SET status = $1, progress = $2, updated_at = NOW() WHERE gate = $3',
        [status, progress, g.gate]
      );
      g.status = status;
      g.progress = progress;
      g.updatedAt = nowIso();
    }
  }

  return {
    updatedAt: nowIso(),
    gates,
    epics: epicsWithBlocked,
    slices,
    dependencies
  };
}

export async function writeAudit({ entityType, entityId, action, actor, before, after }) {
  await query(
    `INSERT INTO execution_audit (entity_type, entity_id, action, actor, before, after)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
    [
      entityType,
      entityId,
      action,
      actor ?? null,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null
    ]
  );
}

export async function listAudit({ limit = 200, entityType, entityId } = {}) {
  const clauses = [];
  const params = [];

  if (entityType) {
    params.push(entityType);
    clauses.push(`entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    clauses.push(`entity_id = $${params.length}`);
  }

  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const res = await query(
    `SELECT id, entity_type, entity_id, action, actor, before, after, created_at
     FROM execution_audit
     ${where}
     ORDER BY id DESC
     LIMIT $${params.length}`,
    params
  );

  return res.rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    actor: r.actor,
    before: r.before,
    after: r.after,
    createdAt: r.created_at
  }));
}

export async function updateEpic(id, patch, actor) {
  const beforeRes = await query('SELECT * FROM execution_epics WHERE id = $1', [id]);
  const before = beforeRes.rows?.[0];
  if (!before) return null;

  const next = {
    status: patch.status ?? before.status,
    rail_priority:
      typeof patch.railPriority === 'boolean' ? patch.railPriority : before.rail_priority,
    owner_role: patch.ownerRole ?? before.owner_role,
    notes: patch.notes ?? before.notes,
    dod: patch.dod ?? before.dod
  };

  await query(
    `UPDATE execution_epics
     SET status = $1,
         rail_priority = $2,
         owner_role = $3,
         notes = $4,
         dod = $5,
         updated_at = NOW()
     WHERE id = $6`,
    [next.status, next.rail_priority, next.owner_role, next.notes, next.dod, id]
  );

  const afterRes = await query('SELECT * FROM execution_epics WHERE id = $1', [id]);
  const after = afterRes.rows?.[0];
  await writeAudit({ entityType: 'epic', entityId: id, action: 'update', actor, before, after });
  return after;
}

export async function updateGate(gate, patch, actor) {
  const beforeRes = await query('SELECT * FROM execution_gates WHERE gate = $1', [gate]);
  const before = beforeRes.rows?.[0];
  if (!before) return null;

  const checklist = Array.isArray(patch.checklist) ? patch.checklist : before.checklist;
  const computed = computeGateStatus(checklist);
  const status = patch.status ?? computed.status;

  await query(
    `UPDATE execution_gates
     SET status = $1,
         checklist = $2::jsonb,
         progress = $3,
         updated_at = NOW()
     WHERE gate = $4`,
    [status, JSON.stringify(checklist ?? []), computed.progress, gate]
  );

  const afterRes = await query('SELECT * FROM execution_gates WHERE gate = $1', [gate]);
  const after = afterRes.rows?.[0];
  await writeAudit({ entityType: 'gate', entityId: gate, action: 'update', actor, before, after });
  return after;
}

export async function upsertSlice(id, patch, actor) {
  const beforeRes = await query('SELECT * FROM execution_slices WHERE id = $1', [id]);
  const before = beforeRes.rows?.[0] ?? null;

  const row = {
    id,
    name: patch.name ?? before?.name ?? 'Untitled slice',
    status: patch.status ?? before?.status ?? 'Backlog',
    owner_role: patch.ownerRole ?? before?.owner_role ?? null,
    gate: patch.gate ?? before?.gate ?? null,
    primary_epic_id: patch.primaryEpicId ?? before?.primary_epic_id ?? null,
    summary: patch.summary ?? before?.summary ?? null,
    acceptance: patch.acceptance ?? before?.acceptance ?? null
  };

  await query(
    `INSERT INTO execution_slices (id, name, status, owner_role, gate, primary_epic_id, summary, acceptance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       owner_role = EXCLUDED.owner_role,
       gate = EXCLUDED.gate,
       primary_epic_id = EXCLUDED.primary_epic_id,
       summary = EXCLUDED.summary,
       acceptance = EXCLUDED.acceptance,
       updated_at = NOW()`,
    [
      row.id,
      row.name,
      row.status,
      row.owner_role,
      row.gate,
      row.primary_epic_id,
      row.summary,
      row.acceptance
    ]
  );

  const afterRes = await query('SELECT * FROM execution_slices WHERE id = $1', [id]);
  const after = afterRes.rows?.[0];
  await writeAudit({
    entityType: 'slice',
    entityId: id,
    action: before ? 'update' : 'create',
    actor,
    before,
    after
  });
  return after;
}

export async function deleteSlice(id, actor) {
  const beforeRes = await query('SELECT * FROM execution_slices WHERE id = $1', [id]);
  const before = beforeRes.rows?.[0];
  if (!before) return false;
  await query('DELETE FROM execution_slices WHERE id = $1', [id]);
  await writeAudit({ entityType: 'slice', entityId: id, action: 'delete', actor, before, after: null });
  return true;
}

export async function addDependency(dep, actor) {
  await query(
    `INSERT INTO execution_dependencies (from_kind, from_id, to_kind, to_id, relation)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (from_kind, from_id, to_kind, to_id, relation) DO NOTHING`,
    [dep.fromKind, dep.fromId, dep.toKind, dep.toId, dep.relation ?? 'blocks']
  );
  await writeAudit({
    entityType: 'dependency',
    entityId: `${dep.fromKind}:${dep.fromId}->${dep.toKind}:${dep.toId}`,
    action: 'create',
    actor,
    before: null,
    after: dep
  });
}

export async function removeDependency(id, actor) {
  const beforeRes = await query('SELECT * FROM execution_dependencies WHERE id = $1', [id]);
  const before = beforeRes.rows?.[0];
  if (!before) return false;
  await query('DELETE FROM execution_dependencies WHERE id = $1', [id]);
  await writeAudit({ entityType: 'dependency', entityId: String(id), action: 'delete', actor, before, after: null });
  return true;
}

export async function createOrchestratorAction({
  actionType,
  entityType,
  entityId,
  payload,
  requestedBy
}) {
  const res = await query(
    `INSERT INTO execution_orchestrator_actions (action_type, entity_type, entity_id, payload, requested_by)
     VALUES ($1,$2,$3,$4::jsonb,$5)
     RETURNING id, action_type, entity_type, entity_id, status, payload, requested_by, created_at`,
    [actionType, entityType, entityId, payload ? JSON.stringify(payload) : null, requestedBy ?? null]
  );
  return res.rows?.[0] ?? null;
}

export async function listOrchestratorActions({ limit = 100 } = {}) {
  const res = await query(
    `SELECT id, action_type, entity_type, entity_id, requested_by, status, payload, result, created_at, updated_at
     FROM execution_orchestrator_actions
     ORDER BY id DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows.map((r) => ({
    id: r.id,
    actionType: r.action_type,
    entityType: r.entity_type,
    entityId: r.entity_id,
    requestedBy: r.requested_by,
    status: r.status,
    payload: r.payload,
    result: r.result,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

export function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c])).join(','));
  return [header, ...lines].join('\n');
}
