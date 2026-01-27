/**
 * Minimal Hasura GraphQL client for Nhost functions.
 *
 * This is intentionally tiny and dependency-free.
 */

export function getGraphqlUrl() {
  return (
    process.env.NHOST_GRAPHQL_URL ||
    process.env.HASURA_GRAPHQL_ENDPOINT ||
    process.env.NHOST_HASURA_GRAPHQL_URL ||
    process.env.GRAPHQL_ENDPOINT ||
    ''
  );
}

function getAdminSecret() {
  return (
    process.env.HASURA_ADMIN_SECRET ||
    process.env.NHOST_ADMIN_SECRET ||
    process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
    ''
  );
}

export async function hasuraRequest({ query, variables = {}, role, userId }) {
  const url = getGraphqlUrl();
  if (!url) {
    const err = new Error(
      'Hasura GraphQL URL missing. Set NHOST_GRAPHQL_URL (preferred) or HASURA_GRAPHQL_ENDPOINT.'
    );
    err.code = 'NO_GRAPHQL_URL';
    throw err;
  }

  const headers = { 'Content-Type': 'application/json' };
  const adminSecret = getAdminSecret();
  if (adminSecret) headers['x-hasura-admin-secret'] = adminSecret;
  if (role) headers['x-hasura-role'] = role;
  if (userId) headers['x-hasura-user-id'] = userId;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const err = new Error(
      `Hasura request failed (${res.status}). ${json.errors?.[0]?.message || res.statusText}`
    );
    err.code = 'HASURA_ERROR';
    err.status = res.status;
    err.details = json.errors || json;
    throw err;
  }
  return json.data;
}
