export type HasuraErrorKind =
  | 'permission'
  | 'auth'
  | 'constraint'
  | 'validation'
  | 'network'
  | 'unknown';

export type NormalizedHasuraError = {
  kind: HasuraErrorKind;
  message: string;
  code?: string;
  path?: (string | number)[];
  details?: unknown;
  original?: unknown;
};

export class GraphQLRequestError extends Error {
  readonly normalized: NormalizedHasuraError;
  constructor(normalized: NormalizedHasuraError) {
    super(normalized.message);
    this.name = 'GraphQLRequestError';
    this.normalized = normalized;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Best-effort extraction across common shapes:
// - graphql-request (response.errors)
// - Nhost (error.error.errors)
// - custom wrappers
function extractGraphQLErrors(error: unknown): unknown[] {
  if (!error) return [];
  if (Array.isArray((error as { errors?: unknown[] }).errors)) return (error as { errors: unknown[] }).errors;
  if (Array.isArray((error as { error?: unknown[] }).error)) return (error as { error: unknown[] }).error;
  if (Array.isArray((error as { error?: { errors?: unknown[] } }).error?.errors)) {
    return (error as { error: { errors: unknown[] } }).error.errors;
  }
  if (Array.isArray((error as { response?: { errors?: unknown[] } }).response?.errors)) {
    return (error as { response: { errors: unknown[] } }).response.errors;
  }
  if (Array.isArray((error as { response?: { error?: { errors?: unknown[] } } }).response?.error?.errors)) {
    return (error as { response: { error: { errors: unknown[] } } }).response.error.errors;
  }
  return [];
}

function getFirstMessage(error: unknown): string {
  if (typeof (error as { message?: string })?.message === 'string') return (error as { message: string }).message;
  const gqlErrors = extractGraphQLErrors(error);
  const first = gqlErrors[0] as { message?: string } | undefined;
  if (first && typeof first.message === 'string') return first.message;
  return 'GraphQL request failed';
}

function normalizeCode(code?: unknown): string | undefined {
  if (typeof code === 'string') return code;
  return undefined;
}

function classify(code?: string, message?: string): HasuraErrorKind {
  const c = (code || '').toLowerCase();
  const m = (message || '').toLowerCase();

  // Hasura common codes
  if (c.includes('permission') || m.includes('permission')) return 'permission';
  if (c.includes('invalid-jwt') || c.includes('jwt') || m.includes('jwt') || m.includes('unauthorized')) return 'auth';
  if (c.includes('constraint') || m.includes('constraint') || m.includes('duplicate') || m.includes('violates')) {
    return 'constraint';
  }
  if (c.includes('validation') || m.includes('validation') || m.includes('invalid input')) return 'validation';

  // Network-ish
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) return 'network';

  return 'unknown';
}

export function normalizeHasuraError(error: unknown): NormalizedHasuraError {
  const gqlErrors = extractGraphQLErrors(error);
  const first = (gqlErrors[0] as Record<string, unknown>) || (isObject(error) ? error : undefined);

  const code = normalizeCode(
    (first as { extensions?: { code?: unknown; exception?: { code?: unknown } }; code?: unknown })?.extensions?.code ??
      (first as { extensions?: { exception?: { code?: unknown } } })?.extensions?.exception?.code ??
      (first as { code?: unknown }).code
  );
  const message =
    typeof (first as { message?: string })?.message === 'string'
      ? (first as { message: string }).message
      : getFirstMessage(error);
  const path = Array.isArray((first as { path?: unknown }).path)
    ? ((first as { path: (string | number)[] }).path as (string | number)[])
    : undefined;

  return {
    kind: classify(code, message),
    message,
    code,
    path,
    details: (first as { extensions?: unknown })?.extensions ?? first,
    original: error,
  };
}
