import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNhostConfigSafetyText } from './check-nhost-config-safety.mjs';

test('Nhost config safety flags production-unsafe settings', () => {
  const findings = checkNhostConfigSafetyText(
    `
[hasura.settings]
corsDomain = ['*']
devMode = true
enableAllowList = false
enableConsole = true
enabledAPIs = ['metadata', 'graphql', 'pgdump', 'config']

[auth.method.anonymous]
enabled = true

[auth.method.emailPassword]
emailVerificationRequired = false

[auth.misc]
concealErrors = false

[postgres.resources]
enablePublicAccess = true
`
    ,
    { file: 'nhost/nhost.toml' }
  );
  const ids = findings.map((finding) => finding.check);
  assert.ok(ids.includes('wildcard-cors'));
  assert.ok(ids.includes('dev-mode'));
  assert.ok(ids.includes('allowlist-disabled'));
  assert.ok(ids.includes('console-enabled'));
  assert.ok(ids.includes('anonymous-auth'));
  assert.ok(ids.includes('email-verification-disabled'));
  assert.ok(ids.includes('public-db-access'));
  assert.ok(ids.includes('conceal-errors-disabled'));
  assert.ok(ids.includes('pgdump-api-enabled'));
});

test('Nhost config safety allows explicit local-only examples', () => {
  const findings = checkNhostConfigSafetyText(
    `
# LOCAL_ONLY_NHOST_CONFIG
[hasura.settings]
corsDomain = ['*']
devMode = true
enableAllowList = false
enableConsole = true

[auth.method.anonymous]
enabled = true

[auth.method.emailPassword]
emailVerificationRequired = false

[postgres.resources]
enablePublicAccess = true
`
    ,
    { file: 'nhost/nhost.local.example.toml' }
  );
  assert.equal(findings.length, 0);
});

test('Nhost config safety allows safe production-style config', () => {
  const findings = checkNhostConfigSafetyText(
    `
[hasura.settings]
corsDomain = ['https://app.example.com']
devMode = false
enableAllowList = true
enableConsole = false
enabledAPIs = ['graphql', 'metadata']

[auth.method.anonymous]
enabled = false

[auth.method.emailPassword]
emailVerificationRequired = true

[auth.misc]
concealErrors = true

[postgres.resources]
enablePublicAccess = false
`
    ,
    { file: 'nhost/nhost.toml' }
  );
  assert.deepEqual(findings, []);
});
