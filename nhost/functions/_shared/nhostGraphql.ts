import { z } from 'zod';

const EnvSchema = z.object({
  NHOST_BACKEND_URL: z.string().optional(),
  NHOST_GRAPHQL_URL: z.string().optional(),
});

function getGraphqlUrl() {
  const env = EnvSchema.parse(process.env ?? {});
  if (env.NHOST_GRAPHQL_URL) return env.NHOST_GRAPHQL_URL;

  const backendUrl = env.NHOST_BACKEND_URL || 'http://localhost:1337';
  return `${backendUrl.replace(/\/$/, '')}/v1/graphql`;
}

type GraphqlRequestArgs = {
  query: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
};

export async function nhostGraphqlRequest({ query, variables, headers = {} }: GraphqlRequestArgs) {
  const graphqlUrl = getGraphqlUrl();
  const response = await globalThis.fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.errors) {
    const message = json?.errors?.[0]?.message || response.statusText;
    const err = new Error(`GraphQL request failed (${response.status}): ${message}`);
    (err as Error & { details?: unknown }).details = json;
    throw err;
  }

  return json.data;
}
