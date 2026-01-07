/*
 * Minimal smoke tests to ensure Hasura role permissions do not drift silently.
 */
import assert from 'node:assert';
import { createLogger } from '../backend/utils/logger.js';

const logger = createLogger('scripts.hasura-permissions-smoke');

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const teacherToken = process.env.TEST_JWT_TEACHER;
const districtAdminToken = process.env.TEST_JWT_DISTRICT_ADMIN;

if (!endpoint) throw new Error('HASURA_GRAPHQL_ENDPOINT required');
if (!teacherToken) throw new Error('TEST_JWT_TEACHER required');
if (!districtAdminToken) throw new Error('TEST_JWT_DISTRICT_ADMIN required');

async function runQuery(token: string, query: string, variables?: Record<string, any>) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await resp.json();
  return json;
}

function userIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    const claims = payload['https://hasura.io/jwt/claims'] || {};
    return claims['x-hasura-user-id'] || payload.sub || null;
  } catch (error) {
    logger.warn('decode token failed', error);
    return null;
  }
}

async function testTeacherCannotSelectSources() {
  const result = await runQuery(
    teacherToken!,
    `query TeacherSources { directory_sources(limit: 1) { id name } }`
  );
  assert.ok(result.errors, 'teacher query should fail');
}

async function testTeacherCannotSelectSourceRuns() {
  const result = await runQuery(
    teacherToken!,
    `query TeacherRuns { directory_source_runs(limit: 1) { id status } }`
  );
  assert.ok(result.errors, 'teacher should not access source runs');
}

async function testTeacherNotificationsScoped() {
  const userId = userIdFromJwt(teacherToken!);
  const result = await runQuery(
    teacherToken!,
    `query TeacherNotifs { notifications(limit: 5) { id user_id } }`
  );
  assert.ok(!result.errors, 'teacher notifications should be readable for self');
  if (result.data?.notifications?.length) {
    result.data.notifications.forEach((notif: any) => {
      assert.strictEqual(String(notif.user_id), String(userId), 'notifications must be scoped to user');
    });
  }
}

async function testDistrictAdminCanSelectSources() {
  const result = await runQuery(
    districtAdminToken!,
    `query DistrictSources { directory_sources(limit: 1) { id } }`
  );
  assert.ok(!result.errors, 'district_admin should read sources');
}

async function testDistrictAdminCanSelectRuns() {
  const result = await runQuery(
    districtAdminToken!,
    `query DistrictRuns { directory_source_runs(limit: 1) { id status } }`
  );
  assert.ok(!result.errors, 'district_admin should read source runs');
}

async function testDistrictAdminCanUpdatePreferences() {
  const userId = userIdFromJwt(districtAdminToken!);
  assert.ok(userId, 'district admin token missing user id');
  const result = await runQuery(
    districtAdminToken!,
    `mutation UpdatePrefs($userId: uuid!, $digest: text!) {
      insert_notification_preferences_one(
        object: { user_id: $userId, digest_mode: $digest },
        on_conflict: { constraint: notification_preferences_pkey, update_columns: [digest_mode] }
      ) { user_id digest_mode }
    }`,
    { userId, digest: 'daily' }
  );
  assert.ok(!result.errors, 'district_admin should update own notification preferences');
  assert.strictEqual(result.data?.insert_notification_preferences_one?.user_id, userId);
}

async function main() {
  await testTeacherCannotSelectSources();
  await testTeacherCannotSelectSourceRuns();
  await testTeacherNotificationsScoped();
  await testDistrictAdminCanSelectSources();
  await testDistrictAdminCanSelectRuns();
  await testDistrictAdminCanUpdatePreferences();
  logger.info('permissions smoke tests passed');
}

main().catch((err) => {
  logger.error('permissions smoke tests failed', err);
  process.exit(1);
});
