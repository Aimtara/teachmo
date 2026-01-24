/* eslint-env node */
import express from 'express';
import { z } from 'zod';

import {
  executionEpics,
  executionGates,
  executionSlices,
  executionDependencies,
} from '../models.js';
import { executionBoardSeed } from '../executionBoardSeedData.js';

// Validation schemas
const statusEnum = z.enum(['Backlog', 'Planned', 'In progress', 'Done']);
const gateStatusEnum = z.enum(['Backlog', 'Planned', 'In progress']);

const epicPatchSchema = z.object({
  workstream: z.string().optional(),
  tag: z.string().optional(),
  railSegment: z.string().optional(),
  ownerRole: z.string().optional(),
  upstream: z.string().nullable().optional(),
  downstream: z.string().nullable().optional(),
  gates: z.string().nullable().optional(),
  status: statusEnum.optional(),
  nextMilestone: z.string().optional(),
  dod: z.string().optional(),
  notes: z.string().optional(),
  epicKey: z.string().optional(),
  railPriority: z.union([z.string(), z.number()]).optional(),
});

const gatePatchSchema = z.object({
  purpose: z.string().optional(),
  checklist: z.string().optional(),
  ownerRole: z.string().optional(),
  dependsOn: z.string().optional(),
  targetWindow: z.string().optional(),
  status: gateStatusEnum.optional(),
});

const slicePatchSchema = z.object({
  outcome: z.string().optional(),
  primaryEpic: z.string().optional(),
  gate: z.string().optional(),
  inputs: z.string().optional(),
  deliverables: z.string().optional(),
  acceptance: z.string().optional(),
  status: statusEnum.optional(),
  owner: z.string().optional(),
  storyKey: z.string().optional(),
  dependsOn: z.string().optional(),
});

function ensureSeeded() {
  if (executionEpics.length === 0) {
    executionEpics.push(...executionBoardSeed.epics);
  }
  if (executionGates.length === 0) {
    executionGates.push(...executionBoardSeed.gates);
  }
  if (executionSlices.length === 0) {
    executionSlices.push(...executionBoardSeed.slices);
  }
  if (executionDependencies.length === 0) {
    executionDependencies.push(...executionBoardSeed.dependencies);
  }
}

function computeGateProgress(checklist = '') {
  // checklist is a text block with "☐" and "☑" markers
  const unchecked = (checklist.match(/☐/g) || []).length;
  const checked = (checklist.match(/☑/g) || []).length;
  const total = unchecked + checked;
  return {
    total,
    checked,
    progress: total === 0 ? 0 : checked / total,
  };
}

function enrichBoard() {
  ensureSeeded();
  const epicById = new Map(executionEpics.map((e) => [e.id, e]));

  const deps = executionDependencies.map((d) => ({
    ...d,
    fromStatus: epicById.get(d.from)?.status || 'Unknown',
    toStatus: epicById.get(d.to)?.status || 'Unknown',
  }));

  const blockedBy = new Map();
  deps.forEach((d) => {
    if (d.type !== 'blocks') return;
    if (d.fromStatus === 'Done') return;
    const list = blockedBy.get(d.to) || [];
    list.push(d.from);
    blockedBy.set(d.to, list);
  });

  const epics = executionEpics.map((e) => ({
    ...e,
    blocked: (blockedBy.get(e.id) || []).length > 0,
    blockedBy: blockedBy.get(e.id) || [],
  }));

  const gates = executionGates.map((g) => ({
    ...g,
    ...computeGateProgress(g.checklist),
  }));

  return {
    updatedAt: new Date().toISOString(),
    epics,
    gates,
    slices: executionSlices,
    dependencies: deps,
  };
}

function findById(list, id) {
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return { idx: -1, item: null };
  return { idx, item: list[idx] };
}

// Basic authentication middleware ensuring the request is from an authenticated user.
// This implementation checks for the presence of an Authorization header.
// In a real deployment, this should align with the application's existing auth mechanism.
function requireAuth(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Basic authorization middleware ensuring the user has admin privileges.
// This implementation checks a header-based role; integrate with your user model as appropriate.
function requireAdmin(req, res, next) {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

export const executionBoardRouter = express.Router();

// Protect all execution board routes with authentication and admin authorization.
executionBoardRouter.use(requireAuth);
executionBoardRouter.use(requireAdmin);
executionBoardRouter.get('/board', (req, res) => {
  res.json(enrichBoard());
});

executionBoardRouter.patch('/epics/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const { idx, item } = findById(executionEpics, id);
  if (!item) return res.status(404).json({ error: 'Epic not found' });

  // Validate request body
  const validation = epicPatchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const allowed = [
    'workstream',
    'tag',
    'railSegment',
    'ownerRole',
    'upstream',
    'downstream',
    'gates',
    'status',
    'nextMilestone',
    'dod',
    'notes',
    'epicKey',
    'railPriority',
  ];

  const patch = {};
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
  });

  executionEpics[idx] = { ...item, ...patch, updatedAt: new Date().toISOString() };
  res.json(enrichBoard());
});

executionBoardRouter.patch('/gates/:gate', express.json(), (req, res) => {
  const { gate } = req.params;
  const idx = executionGates.findIndex((g) => g.gate === gate);
  if (idx === -1) return res.status(404).json({ error: 'Gate not found' });

  // Validate request body
  const validation = gatePatchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const allowed = ['purpose', 'checklist', 'ownerRole', 'dependsOn', 'targetWindow', 'status'];
  const patch = {};
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
  });

  executionGates[idx] = { ...executionGates[idx], ...patch, updatedAt: new Date().toISOString() };
  res.json(enrichBoard());
});

executionBoardRouter.patch('/slices/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const { idx, item } = findById(executionSlices, id);
  if (!item) return res.status(404).json({ error: 'Slice not found' });

  // Validate request body
  const validation = slicePatchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const allowed = ['outcome', 'primaryEpic', 'gate', 'inputs', 'deliverables', 'acceptance', 'status', 'owner', 'storyKey', 'dependsOn'];
  const patch = {};
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
  });

  executionSlices[idx] = { ...item, ...patch, updatedAt: new Date().toISOString() };
  res.json(enrichBoard());
});
