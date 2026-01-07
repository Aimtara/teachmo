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
