export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type TenantScope = {
  organizationId: string;
  schoolId?: string | null;
};

export type QueuedMutationResponse = {
  queued: true;
};

export type HttpRequestOptions = {
  method?: RequestInit['method'];
  headers?: HeadersInit;
  body?: BodyInit | null;
};
