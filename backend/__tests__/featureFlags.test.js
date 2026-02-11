import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { evaluateFlag, getRegistry } from '../utils/featureFlags.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendDir, '..');

test('feature flag registry entries include test matrix coverage', () => {
  const registry = getRegistry();
  registry.flags.forEach((flag) => {
    expect(flag.key).toBeTruthy();
    expect(typeof flag.defaultEnabled).toBe('boolean');
    expect(Array.isArray(flag.testMatrix)).toBe(true);
    expect(flag.testMatrix.length).toBeGreaterThan(0);
  });
});

test('feature flag registry matches frontend defaults', () => {
  const contents = fs.readFileSync(path.join(repoRoot, 'src/config/features.ts'), 'utf8');
  const start = contents.indexOf('export const FEATURES');
  const end = contents.indexOf('} as const', start);
  const block = contents.slice(start, end);
  const keys = Array.from(block.matchAll(/^\s*([A-Z0-9_]+):/gm)).map((match) => match[1]);

  const registryKeys = getRegistry().flags.map((flag) => flag.key);
  expect(new Set(keys)).toEqual(new Set(registryKeys));
});

test('backend feature flag registry stays in sync with repo config source', () => {
  const backendRegistryPath = path.join(backendDir, 'config/feature_flags.json');
  const rootRegistryPath = path.join(repoRoot, 'config/feature_flags.json');

  expect(fs.existsSync(backendRegistryPath)).toBe(true);

  if (!fs.existsSync(rootRegistryPath)) return;

  const backendRegistry = fs.readFileSync(backendRegistryPath, 'utf8');
  const rootRegistry = fs.readFileSync(rootRegistryPath, 'utf8');

  expect(backendRegistry).toBe(rootRegistry);
});

test('evaluateFlag honors allowlist, denylist, canary, and rollout', () => {
  const context = { userId: 'user-123', organizationId: 'org-1' };

  const allowlist = ['org-1'];
  const denylist = ['org-2'];
  const enabled = evaluateFlag({
    key: 'DISCOVER',
    context,
    override: {
      enabled: false,
      rolloutPercentage: 0,
      canaryPercentage: 0,
      allowlist,
      denylist,
    },
  });

  expect(enabled).toBe(true);

  const denied = evaluateFlag({
    key: 'DISCOVER',
    context,
    override: {
      enabled: true,
      rolloutPercentage: 100,
      canaryPercentage: 100,
      denylist: ['org-1'],
    },
  });

  expect(denied).toBe(false);
});
