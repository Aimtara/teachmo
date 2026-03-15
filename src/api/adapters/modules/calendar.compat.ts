import { apiClient } from '@/services/core/client';
import type { CalendarEvent, Paginated } from '../types';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<CalendarEvent>> {
  const items = await apiClient.entity.filter<CalendarEvent>('CalendarEvent', params);
  return { items: items ?? [], nextCursor: null };
}

export async function getById(id: string): Promise<CalendarEvent | null> {
  return apiClient.entity.get<CalendarEvent>('CalendarEvent', id);
}
