/* eslint-env node */
import { query } from './db.js';
import { executionBoardSeed } from './executionBoardSeedData.js';

function nowIso() {
  return new Date().toISOString();
}

export async function ensureExecutionBoardReady() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS execution_epics (
        id TEXT PRIMARY KEY,
        workstream TEXT NOT NULL,
        tag TEXT NOT NULL,
        rail_segment TEXT NOT NULL,
        owner_role TEXT,
        upstream TEXT,
        downstream TEXT,
        gates TEXT,
        status TEXT NOT NULL DEFAULT 'Backlog',
        next_milestone TEXT,
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
        checklist JSONB,
        owner_role TEXT,
        depends_on TEXT,
        target_window TEXT,
        status TEXT NOT NULL DEFAULT 'Planned',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS execution_slices (
        id TEXT PRIMARY KEY,
        outcome TEXT NOT NULL,
        primary_epic TEXT,
        gate TEXT,
        inputs TEXT,
        deliverables TEXT,
        acceptance TEXT,
        status TEXT NOT NULL DEFAULT 'Backlog',
        owner TEXT,
        depends_on TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS execution_dependencies (
        id BIGSERIAL PRIMARY KEY,
        from_epic TEXT NOT NULL,
        to_epic TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'blocks',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(from_epic, to_epic, type)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS execution_board_audit (
        id BIGSERIAL PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        patch JSONB,
        actor TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const countRes = await query('SELECT COUNT(*)::int AS count FROM execution_epics');
    const count = countRes.rows?.[0]?.count ?? 0;
    if (count === 0) {
      await seedExecutionBoard();
    }

    return true;
  } catch (err) {
    console.warn('[execution-board] DB unavailable:', err.message);
    return false;
  }
}

async function seedExecutionBoard() {
  for (const g of executionBoardSeed.gates) {
    await query(
      `INSERT INTO execution_gates
        (gate, purpose, checklist, owner_role, depends_on, target_window, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (gate) DO NOTHING`,
      [g.gate, g.purpose, JSON.stringify(g.checklist || []), g.ownerRole || null, g.dependsOn || null, g.targetWindow || null, g.status || 'Planned']
    );
  }

  for (const e of executionBoardSeed.epics) {
    await query(
      `INSERT INTO execution_epics
        (id, workstream, tag, rail_segment, owner_role, upstream, downstream, gates, status, next_milestone, dod, notes, rail_priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        e.id,
        e.workstream,
        e.tag,
        e.railSegment,
        e.ownerRole || null,
        e.upstream || null,
        e.downstream || null,
        e.gates || null,
        e.status || 'Backlog',
        e.nextMilestone || null,
        e.dod || null,
        e.notes || null,
        Boolean(e.railPriority)
      ]
    );
  }

  for (const s of executionBoardSeed.slices) {
    await query(
      `INSERT INTO execution_slices
        (id, outcome, primary_epic, gate, inputs, deliverables, acceptance, status, owner, depends_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        s.id,
        s.outcome,
        s.primaryEpic || null,
        s.gate || null,
        s.inputs || null,
        s.deliverables || null,
        s.acceptance || null,
        s.status || 'Backlog',
        s.owner || null,
        s.dependsOn || null
      ]
    );
  }

  for (const d of executionBoardSeed.dependencies) {
    await query(
      `INSERT INTO execution_dependencies (from_epic, to_epic, type, notes)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (from_epic, to_epic, type) DO NOTHING`,
      [d.fromEpic, d.toEpic, d.type || 'blocks', d.notes || null]
    );
  }
}

async function audit(entity, entityId, action, patch, actor) {
  try {
    await query(
      `INSERT INTO execution_board_audit (entity, entity_id, action, patch, actor)
       VALUES ($1,$2,$3,$4,$5)`,
      [entity, entityId, action, patch ? JSON.stringify(patch) : null, actor || null]
    );
  } catch (err) {
    console.warn('[execution-board] audit write failed:', err.message);
  }
}

function safeParseJson(maybeJson, fallback) {
  if (maybeJson == null) return fallback;
  if (typeof maybeJson === 'object') return maybeJson;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return fallback;
  }
}

export async function getExecutionBoard(dbReady = true) {
  if (!dbReady) {
    return {
      ...executionBoardSeed,
      epics: executionBoardSeed.epics.map((e) => ({ ...e, blocked: false })),
      updatedAt: executionBoardSeed.updatedAt
    };
  }

  const [epicsRes, gatesRes, slicesRes, depsRes] = await Promise.all([
    query('SELECT * FROM execution_epics ORDER BY id ASC'),
    query('SELECT * FROM execution_gates ORDER BY gate ASC'),
    query('SELECT * FROM execution_slices ORDER BY id ASC'),
    query('SELECT * FROM execution_dependencies ORDER BY id ASC')
  ]);

  const epics = epicsRes.rows.map((r) => ({
    id: r.id,
    workstream: r.workstream,
    tag: r.tag,
    railSegment: r.rail_segment,
    ownerRole: r.owner_role,
    upstream: r.upstream || '',
    downstream: r.downstream || '',
    gates: r.gates || '',
    status: r.status,
    nextMilestone: r.next_milestone || '',
    dod: r.dod || '',
    notes: r.notes || '',
    railPriority: Boolean(r.rail_priority)
  }));

  const gates = gatesRes.rows.map((r) => ({
    gate: r.gate,
    purpose: r.purpose,
    checklist: safeParseJson(r.checklist, []),
    ownerRole: r.owner_role || '',
    dependsOn: r.depends_on || '',
    targetWindow: r.target_window || '',
    status: r.status
  }));

  const slices = slicesRes.rows.map((r) => ({
    id: r.id,
    outcome: r.outcome,
    primaryEpic: r.primary_epic || '',
    gate: r.gate || '',
    inputs: r.inputs || '',
    deliverables: r.deliverables || '',
    acceptance: r.acceptance || '',
    status: r.status,
    owner: r.owner || '',
    dependsOn: r.depends_on || ''
  }));

  const dependencies = depsRes.rows.map((r) => ({
    id: r.id,
    fromEpic: r.from_epic,
    toEpic: r.to_epic,
    type: r.type,
    notes: r.notes || ''
  }));

  const statusByEpic = new Map(epics.map((e) => [e.id, e.status]));
  const incoming = new Map();
  for (const d of dependencies) {
    if (d.type !== 'blocks') continue;
    const list = incoming.get(d.toEpic) || [];
    list.push(d.fromEpic);
    incoming.set(d.toEpic, list);
  }

  const epicsWithBlocked = epics.map((e) => {
    const blockers = incoming.get(e.id) || [];
    const blocked = blockers.some((b) => (statusByEpic.get(b) || 'Backlog') !== 'Done');
    return { ...e, blocked };
  });

  return {
    updatedAt: nowIso(),
    epics: epicsWithBlocked,
    gates,
    slices,
    dependencies
  };
}

export async function updateEpic(id, patch, actor) {
  const allowed = ['status', 'railPriority', 'notes', 'nextMilestone', 'ownerRole', 'tag', 'railSegment', 'gates'];
  const keys = Object.keys(patch || {}).filter((k) => allowed.includes(k));
  if (keys.length === 0) return false;

  const fields = [];
  const values = [];
  let i = 1;

  for (const key of keys) {
    const col = key === 'railPriority' ? 'rail_priority'
      : key === 'nextMilestone' ? 'next_milestone'
      : key === 'ownerRole' ? 'owner_role'
      : key === 'railSegment' ? 'rail_segment'
      : key;

    fields.push(`${col} = $${i++}`);
    values.push(key === 'railPriority' ? Boolean(patch[key]) : patch[key]);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const res = await query(`UPDATE execution_epics SET ${fields.join(', ')} WHERE id = $${i} RETURNING id`, values);
  if (res.rowCount === 0) return false;
  await audit('epic', id, 'patch', patch, actor);
  return true;
}

export async function createSlice(slice, actor) {
  if (!slice?.id) throw new Error('slice.id is required');
  const res = await query(
    `INSERT INTO execution_slices
      (id, outcome, primary_epic, gate, inputs, deliverables, acceptance, status, owner, depends_on)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [
      slice.id,
      slice.outcome || '',
      slice.primaryEpic || null,
      slice.gate || null,
      slice.inputs || null,
      slice.deliverables || null,
      slice.acceptance || null,
      slice.status || 'Backlog',
      slice.owner || null,
      slice.dependsOn || null
    ]
  );

  if (res.rowCount === 0) return false;
  await audit('slice', slice.id, 'create', slice, actor);
  return true;
}

export async function updateSlice(id, patch, actor) {
  const allowed = ['outcome', 'primaryEpic', 'gate', 'inputs', 'deliverables', 'acceptance', 'status', 'owner', 'dependsOn'];
  const keys = Object.keys(patch || {}).filter((k) => allowed.includes(k));
  if (keys.length === 0) return false;

  const fields = [];
  const values = [];
  let i = 1;

  for (const key of keys) {
    const col = key === 'primaryEpic' ? 'primary_epic'
      : key === 'dependsOn' ? 'depends_on'
      : key;
    fields.push(`${col} = $${i++}`);
    values.push(patch[key]);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const res = await query(`UPDATE execution_slices SET ${fields.join(', ')} WHERE id = $${i} RETURNING id`, values);
  if (res.rowCount === 0) return false;
  await audit('slice', id, 'patch', patch, actor);
  return true;
}

export async function updateGate(gate, patch, actor) {
  const checklist = patch.checklist ? JSON.stringify(patch.checklist) : null;
  const status = patch.status;

  const res = await query(
    `UPDATE execution_gates
     SET checklist = COALESCE($1, checklist),
         status = COALESCE($2, status),
         updated_at = NOW()
     WHERE gate = $3
     RETURNING gate`,
    [checklist, status, gate]
  );

  if (res.rowCount === 0) return false;
  await audit('gate', gate, 'patch', patch, actor);
  return true;
}

export async function createDependency(dep, actor) {
  const res = await query(
    `INSERT INTO execution_dependencies (from_epic, to_epic, type, notes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (from_epic, to_epic, type) DO UPDATE SET notes = EXCLUDED.notes
     RETURNING id`,
    [dep.fromEpic, dep.toEpic, dep.type || 'blocks', dep.notes || null]
  );

  const id = res.rows?.[0]?.id;
  await audit('dependency', String(id), 'upsert', dep, actor);
  return id;
}

export async function deleteDependency(id, actor) {
  const res = await query('DELETE FROM execution_dependencies WHERE id = $1 RETURNING id', [id]);
  if (res.rowCount === 0) return false;
  await audit('dependency', String(id), 'delete', { id }, actor);
  return true;
}

export async function getExecutionAudit({ limit = 200, entity, entityId } = {}) {
  const where = [];
  const params = [];
  let i = 1;

  if (entity) {
    where.push(`entity = $${i++}`);
    params.push(entity);
  }
  if (entityId) {
    where.push(`entity_id = $${i++}`);
    params.push(entityId);
  }

  params.push(Math.min(Math.max(Number(limit) || 200, 1), 500));

  const sql = `SELECT id, entity, entity_id AS "entityId", action, patch, actor, created_at AS "createdAt"
               FROM execution_board_audit
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY id DESC
               LIMIT $${i}`;

  const res = await query(sql, params);
  return res.rows.map((r) => ({
    ...r,
    patch: safeParseJson(r.patch, r.patch)
  }));
}
