export interface Activity {
  id: string;
  title?: string | null;
  description?: string | null;
  subject?: string | null;
  grade_level?: string | null;
  category?: string | null;
  status?: string | null;
  duration?: string | null;
  materials_needed?: string[] | null;
  why_it_matters?: string | null;
  teachmo_tip?: string | null;
  learning_objectives?: string[] | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
