/**
 * GraphQL error structure following the GraphQL specification
 * @see https://spec.graphql.org/October2021/#sec-Errors
 */
export type GraphQLError = {
  message: string;
  extensions?: Record<string, unknown>;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
};

/**
 * Hasura GraphQL response structure
 */
export type HasuraResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

/**
 * Hasura client function type
 */
export type HasuraClient = <T>(query: string, variables?: Record<string, unknown>) => Promise<HasuraResponse<T>>;
 * Type definitions for Hasura GraphQL responses
 */

export type HasuraError = {
  message: string;
  extensions?: Record<string, unknown>;
  path?: (string | number)[];
  locations?: { line: number; column: number }[];
};

export type HasuraResponse<T> = {
  data?: T;
  errors?: HasuraError[];
};

export type HasuraClient = <T>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<HasuraResponse<T>>;

export function getHasuraErrorMessage(errors?: HasuraError[]): string {
  if (!errors || errors.length === 0) {
    return 'hasura_error';
  }

  const firstError = errors[0];
  if (firstError && typeof firstError.message === 'string' && firstError.message.length > 0) {
    return firstError.message;
  }

  return 'hasura_error';
}
