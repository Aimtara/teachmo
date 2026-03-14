import { apiClient } from '@/services/core/client';
import type { Event, Paginated } from '../types';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Event>> {
  const items = await apiClient.entity.filter<Event>('Event', params);
  return { items: items ?? [], nextCursor: null };
}

export async function getById(id: string): Promise<Event | null> {
  return apiClient.entity.get<Event>('Event', id);
}
