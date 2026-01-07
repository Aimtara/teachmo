/**
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
