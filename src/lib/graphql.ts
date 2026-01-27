import { nhost } from './nhostClient';
import { logger } from './logger';
import { GraphQLRequestError, normalizeHasuraError } from './hasuraErrors';

export type GraphqlRequestOptions<TVariables = Record<string, unknown>> = {
  query: string;
  variables?: TVariables;
  headers?: Record<string, string>;
};

export async function graphqlRequest<TData = unknown, TVariables = Record<string, unknown>>(
  { query, variables, headers = {} }: GraphqlRequestOptions<TVariables>
): Promise<TData> {
  const { data, error } = await nhost.graphql.request<TData>(query, variables as never, headers as never);

  if (error) {
    const normalized = normalizeHasuraError(error);
    logger.warn('GraphQL request failed', {
      kind: normalized.kind,
      code: normalized.code,
      message: normalized.message,
      path: normalized.path,
    });
    throw new GraphQLRequestError(normalized);
  }

  return data;
}

export async function graphql<TData = unknown, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
  headers?: Record<string, string>
): Promise<TData> {
  return graphqlRequest<TData, TVariables>({ query, variables, headers });
}

export function buildMutation(operationName: string, fields: string): string {
  return `mutation ${operationName}($input: ${operationName}_input!) { ${operationName}(object: $input) { ${fields} } }`;
}
