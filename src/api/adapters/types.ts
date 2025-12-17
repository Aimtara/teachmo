export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ListEventsParams {
  /** Filter by school ID (accepts either camelCase or snake_case) */
  schoolId?: string;
  school_id?: string;
  limit?: number;
  offset?: number;
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
