import type { HasuraClient } from './directoryImportCore';

function resolveHasuraUrl() {
  return (
    process.env.NHOST_GRAPHQL_URL ||
    process.env.HASURA_GRAPHQL_ENDPOINT ||
    process.env.HASURA_GRAPHQL_URL ||
    (process.env.NHOST_BACKEND_URL ? `${process.env.NHOST_BACKEND_URL}/v1/graphql` : null)
  );
}

function resolveAdminSecret() {
  return process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || process.env.HASURA_ADMIN_SECRET;
}

export async function createHasuraClient(): Promise<HasuraClient> {
  const hasuraUrl = resolveHasuraUrl();
  const adminSecret = resolveAdminSecret();

  if (!hasuraUrl || !adminSecret) {
    throw new Error('Missing Hasura URL or admin secret configuration.');
  }

  return async (query: string, variables?: Record<string, any>) => {
    const response = await fetch(hasuraUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': adminSecret,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  };
}
