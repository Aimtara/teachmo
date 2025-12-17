export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Event {
  id: string;
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  location?: string;
  location_name?: string;
  school_id?: string;
  [key: string]: unknown;
}
