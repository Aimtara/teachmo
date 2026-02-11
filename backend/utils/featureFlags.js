import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function resolveRegistryPath() {
  const candidates = [
    process.env.FEATURE_FLAGS_PATH,
    path.resolve(process.cwd(), 'config/feature_flags.json'),
    path.resolve(process.cwd(), '../config/feature_flags.json'),
  ].filter(Boolean);

  const match = candidates.find((candidate) => fs.existsSync(candidate));

  if (!match) {
    throw new Error(
      `Feature flag registry not found. Checked: ${candidates.join(', ')}`,
    );
  }

  return match;
}

const registryPath = resolveRegistryPath();

function loadRegistry() {
  const raw = fs.readFileSync(registryPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed?.flags ? parsed : { flags: [] };
}

const registry = loadRegistry();
const registryMap = new Map(registry.flags.map((flag) => [flag.key, flag]));

export function getRegistry() {
  return registry;
}

export function getRegistryDefaults() {
  return registry.flags.reduce((acc, flag) => {
    acc[flag.key] = Boolean(flag.defaultEnabled);
    return acc;
  }, {});
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function computeBucket(identifier, key) {
  if (!identifier) return 100;
  const hash = crypto.createHash('sha256').update(`${key}:${identifier}`).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket;
}

function resolveTargets(context) {
  const tenantId = context?.schoolId || context?.districtId || context?.organizationId || null;
  const targets = new Set([tenantId, context?.userId].filter(Boolean));
  return { tenantId, targets: Array.from(targets) };
}

export function evaluateFlag({ key, context, override }) {
  const registryEntry = registryMap.get(key);
  const defaultEnabled = registryEntry ? Boolean(registryEntry.defaultEnabled) : false;
  const enabled = override?.enabled ?? defaultEnabled;
  const rolloutPercentage = override?.rolloutPercentage ?? null;
  const canaryPercentage = override?.canaryPercentage ?? null;
  const allowlist = normalizeList(override?.allowlist);
  const denylist = normalizeList(override?.denylist);
  const { targets, tenantId } = resolveTargets(context);
  const identifier = context?.userId || tenantId;
  const bucket = computeBucket(identifier, key);

  if (denylist.some((id) => targets.includes(id))) return false;
  if (allowlist.some((id) => targets.includes(id))) return true;
  if (typeof canaryPercentage === 'number' && canaryPercentage > 0 && bucket < canaryPercentage) return true;
  if (typeof rolloutPercentage === 'number') return bucket < rolloutPercentage;

  return Boolean(enabled);
}

export function resolveFlags({ context, overrides }) {
  const defaults = getRegistryDefaults();
  const output = { ...defaults };
  const keys = new Set([...Object.keys(defaults), ...Object.keys(overrides ?? {})]);

  keys.forEach((key) => {
    output[key] = evaluateFlag({ key, context, override: overrides?.[key] });
  });

  return output;
}

export function mergeOverridesByKey(rows, schoolId) {
  const overrides = {};
  if (!rows) return overrides;

  rows.forEach((row) => {
    if (!row?.key) return;
    const hasSchoolOverride = row.school_id && schoolId && row.school_id === schoolId;
    const existing = overrides[row.key];

    if (!existing || (hasSchoolOverride && !existing.school_id)) {
      overrides[row.key] = row;
    }
  });

  return overrides;
}

export function serializeAdminFlag({ key, override, scope }) {
  const registryEntry = registryMap.get(key);
  return {
    key,
    description: override?.description ?? registryEntry?.description ?? null,
    defaultEnabled: registryEntry ? Boolean(registryEntry.defaultEnabled) : false,
    enabled: override?.enabled ?? null,
    rolloutPercentage: override?.rollout_percentage ?? null,
    canaryPercentage: override?.canary_percentage ?? null,
    allowlist: normalizeList(override?.allowlist),
    denylist: normalizeList(override?.denylist),
    scope,
    source: override ? 'override' : 'registry',
  };
}

export function normalizeAdminPayload(payload = {}) {
  const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  return {
    enabled: payload.enabled === undefined ? undefined : Boolean(payload.enabled),
    description: payload.description === undefined ? undefined : payload.description,
    rolloutPercentage: toNumberOrNull(payload.rolloutPercentage),
    canaryPercentage: toNumberOrNull(payload.canaryPercentage),
    allowlist: normalizeList(payload.allowlist),
    denylist: normalizeList(payload.denylist),
  };
}
