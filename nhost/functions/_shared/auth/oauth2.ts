import { HasuraClient } from '../directory/types';

type TokenRecord = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

type CachedToken = {
  token_type: string;
  access_token: string;
  expires_at: number | null;
  scope?: string | null;
};

function isTokenValid(token: CachedToken | null) {
  if (!token) return false;
  if (!token.expires_at) return true;
  const now = Date.now();
  return token.expires_at - now > 60_000;
}

async function loadCachedToken(hasura: HasuraClient, sourceId: string): Promise<CachedToken | null> {
  const resp = await hasura(
    `query Token($sourceId: uuid!) {
      directory_source_tokens(where: { source_id: { _eq: $sourceId } }, limit: 1) {
        token_type
        access_token
        expires_at
        scope
        updated_at
      }
    }`,
    { sourceId }
  );

  const token = resp?.data?.directory_source_tokens?.[0];
  if (!token) return null;

  return {
    token_type: token.token_type || 'bearer',
    access_token: token.access_token,
    expires_at: token.expires_at ? new Date(token.expires_at).getTime() : null,
    scope: token.scope ?? null,
  };
}

async function storeToken(hasura: HasuraClient, sourceId: string, token: CachedToken) {
  await hasura(
    `mutation UpsertToken($object: directory_source_tokens_insert_input!) {
      insert_directory_source_tokens_one(
        object: $object,
        on_conflict: { constraint: directory_source_tokens_source_id_key, update_columns: [access_token, expires_at, scope, token_type, updated_at] }
      ) { id }
    }`,
    {
      object: {
        source_id: sourceId,
        token_type: token.token_type,
        access_token: token.access_token,
        expires_at: token.expires_at ? new Date(token.expires_at).toISOString() : null,
        scope: token.scope,
      },
    }
  );
}

export async function getClientCredentialsToken(params: {
  hasura: HasuraClient;
  sourceId: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}) {
  const { hasura, sourceId, tokenUrl, clientId, clientSecret, scope } = params;
  const existing = await loadCachedToken(hasura, sourceId);
  if (isTokenValid(existing)) {
    return `${existing!.token_type || 'bearer'} ${existing!.access_token}`.trim();
  }

  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  if (scope) body.append('scope', scope);

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${authHeader}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`token_fetch_failed_${response.status}`);
  }

  const json = (await response.json()) as TokenRecord;
  const expiresInMs = json.expires_in ? Date.now() + json.expires_in * 1000 : null;
  const cached: CachedToken = {
    access_token: json.access_token,
    token_type: json.token_type || 'bearer',
    expires_at: expiresInMs,
    scope: json.scope ?? scope ?? null,
  };

  await storeToken(hasura, sourceId, cached);

  return `${cached.token_type} ${cached.access_token}`.trim();
}
