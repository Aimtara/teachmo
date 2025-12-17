export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Event {
  id: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  starts_at?: string;
  ends_at?: string;
  location?: string;
  location_name?: string;
  school_id?: string;
  [key: string]: unknown;
}

export interface QueryParams {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  // Support both camelCase and snake_case conventions for school ID
  schoolId?: string;
  school_id?: string;
  [key: string]: unknown;
}
