/*
 * Minimal smoke tests to ensure Hasura role permissions do not drift silently.
 */
import assert from 'node:assert';

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

async function testTeacherCannotSelectSources() {
  const result = await runQuery(
    teacherToken!,
    `query TeacherSources { directory_sources(limit: 1) { id name } }`
  );
  assert.ok(result.errors, 'teacher query should fail');
}

async function testTeacherNotificationsScoped() {
  const result = await runQuery(
    teacherToken!,
    `query TeacherNotifs { notification_outbox(limit: 1) { id recipient_id } }`
  );
  assert.ok(result.errors, 'teacher notifications must be scoped');
}

async function testDistrictAdminCanSelectSources() {
  const result = await runQuery(
    districtAdminToken!,
    `query DistrictSources { directory_sources(limit: 1) { id } }`
  );
  assert.ok(!result.errors, 'district_admin should read sources');
}

async function main() {
  await testTeacherCannotSelectSources();
  await testTeacherNotificationsScoped();
  await testDistrictAdminCanSelectSources();
  console.log('permissions smoke tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
