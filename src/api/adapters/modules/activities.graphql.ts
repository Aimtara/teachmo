import type { Activity, Paginated } from '../types';
import { getActivity, listActivities } from '@/domains/activities';

export async function list(params: Record<string, any> = {}): Promise<Paginated<Activity>> {
  const result = await listActivities(params);

  if (Array.isArray(result)) {
    return { items: result, nextCursor: null };
  }

  return {
    items: result.items ?? [],
    nextCursor: result.nextCursor ?? null
  };
}

export async function getById(id: string): Promise<Activity | null> {
  if (!id) return null;
  return getActivity(id);
}
