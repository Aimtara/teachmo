/* eslint-env node */

function resolveHasuraUrl() {
  return (
    process.env.NHOST_GRAPHQL_URL ||
    process.env.HASURA_GRAPHQL_URL ||
    (process.env.NHOST_BACKEND_URL ? `${process.env.NHOST_BACKEND_URL}/v1/graphql` : null)
  );
}

function resolveAdminSecret() {
  return process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || process.env.HASURA_ADMIN_SECRET;
}

export async function hasuraRequest({ query, variables = {}, admin = true, userJwt = null }) {
  const url = resolveHasuraUrl();
  if (!url) {
    throw new Error('Hasura GraphQL URL is not configured. Set NHOST_GRAPHQL_URL or HASURA_GRAPHQL_URL.');
  }

  const headers = { 'Content-Type': 'application/json' };

  if (admin) {
    const secret = resolveAdminSecret();
    if (!secret) {
      throw new Error('Hasura admin secret is not configured. Set NHOST_ADMIN_SECRET or HASURA_GRAPHQL_ADMIN_SECRET.');
    }
    headers['x-hasura-admin-secret'] = secret;
  } else if (userJwt) {
    headers['authorization'] = `Bearer ${userJwt}`;
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json.errors) {
    const details = json.errors ? JSON.stringify(json.errors) : JSON.stringify(json);
    throw new Error(`Hasura request failed (${resp.status}): ${details}`);
  }

  return json.data;
}
