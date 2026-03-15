import { apiClient } from '@/services/core/client';
import type { Activity, Paginated } from '../types';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Activity>> {
  const items = await apiClient.entity.filter<Activity>('Activity', params);
  return { items: items ?? [], nextCursor: null };
}

export async function getById(id: string): Promise<Activity | null> {
  return apiClient.entity.get<Activity>('Activity', id);
}
