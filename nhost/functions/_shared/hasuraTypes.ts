export type GraphQLErrorLocation = {
  line: number;
  column: number;
};

export type GraphQLError = {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
};

export type HasuraResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

export function getHasuraErrorMessage(errors?: GraphQLError[]): string {
  if (!errors || errors.length === 0) {
    return 'hasura_error';
  }

  const firstError = errors[0];
  if (firstError && typeof firstError.message === 'string' && firstError.message.length > 0) {
    return firstError.message;
  }

  return 'hasura_error';
}
