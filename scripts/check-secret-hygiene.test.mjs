import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSecretFindings } from './check-secret-hygiene.mjs';

function findingIds(text, file = 'fixture.txt') {
  return detectSecretFindings([{ path: file, content: text }]).map((finding) => finding.check);
}

test('secret hygiene catches Google OAuth client secret pattern', () => {
  assert.ok(findingIds("clientSecret = 'GOCSPX-realSecretValue1234567890'").includes('google-oauth-secret'));
});

test('secret hygiene catches real-looking clientSecret assignments', () => {
  assert.ok(findingIds("clientSecret = 'super-real-client-secret-value'").includes('client-secret-assignment'));
  assert.ok(findingIds('clientSecret: "another-real-client-secret-value"').includes('client-secret-assignment'));
});

test('secret hygiene allows placeholders and secret manager references', () => {
  assert.deepEqual(findingIds("clientSecret = 'REPLACE_ME'"), []);
  assert.deepEqual(findingIds("clientSecret = '{{ secrets.GOOGLE_OAUTH_CLIENT_SECRET }}'"), []);
  assert.deepEqual(findingIds("clientSecret = '${GOOGLE_OAUTH_CLIENT_SECRET}'"), []);
  assert.deepEqual(findingIds("HASURA_GRAPHQL_ADMIN_SECRET="), []);
});

test('secret hygiene catches admin secrets, database URLs, private keys, and API keys', () => {
  const ids = findingIds(`
    HASURA_GRAPHQL_ADMIN_SECRET=hasura-admin-secret-production-value
    DATABASE_URL=postgresql://teachmo:realpassword@db.example.com:5432/teachmo
    OPENAI_API_KEY=sk-proj-realSecretValueForTestsOnly
    -----BEGIN PRIVATE KEY-----
  `);
  assert.ok(ids.includes('hasura-nhost-admin-secret-assignment'));
  assert.ok(ids.includes('database-url-password'));
  assert.ok(ids.includes('openai-key'));
  assert.ok(ids.includes('private-key'));
});
