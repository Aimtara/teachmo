import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_VARS = [];

const args = new Set(process.argv.slice(2));
const checkExample = args.has('--example');

function fail(message) {
  console.error(`[preflight] ${message}`);
  process.exit(1);
}

if (checkExample) {
  const examplePath = resolve('.env.example');
  let contents = '';
  try {
    contents = readFileSync(examplePath, 'utf8');
  } catch (error) {
    fail(`Unable to read ${examplePath}: ${error.message}`);
  }

  const declaredKeys = new Set(
    contents
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0])
  );

  const missing = REQUIRED_VARS.filter((key) => !declaredKeys.has(key));
  if (missing.length > 0) {
    fail(`.env.example is missing required keys: ${missing.join(', ')}`);
  }

  const hasBackendUrlKey = declaredKeys.has('VITE_NHOST_BACKEND_URL');
  const hasSubdomainKey = declaredKeys.has('VITE_NHOST_SUBDOMAIN');
  if (!hasBackendUrlKey && !hasSubdomainKey) {
    fail(
      '.env.example must declare either VITE_NHOST_BACKEND_URL or VITE_NHOST_SUBDOMAIN for Nhost configuration.'
    );
  }

  console.log('[preflight] .env.example looks good.');
  process.exit(0);
}

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  fail(`Missing required environment variables: ${missing.join(', ')}`);
}

const hasBackendUrl =
  typeof process.env.VITE_NHOST_BACKEND_URL === 'string' &&
  process.env.VITE_NHOST_BACKEND_URL.trim() !== '';
const hasSubdomain =
  typeof process.env.VITE_NHOST_SUBDOMAIN === 'string' &&
  process.env.VITE_NHOST_SUBDOMAIN.trim() !== '';

if (!hasBackendUrl && !hasSubdomain) {
  fail(
    'Missing Nhost configuration. Set either VITE_NHOST_BACKEND_URL or VITE_NHOST_SUBDOMAIN (with optional VITE_NHOST_REGION).'
  );
}

console.log('[preflight] Environment looks good.');
