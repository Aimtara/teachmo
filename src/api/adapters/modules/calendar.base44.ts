import base44Entities from '@/api/base44/entities';
import type { CalendarEvent, Paginated } from '../types';

export async function list(params: Record<string, any> = {}): Promise<Paginated<CalendarEvent>> {
  const items = await base44Entities.CalendarEvent?.findMany?.(params);
  return { items: items ?? [], nextCursor: null };
}

export async function getById(id: string): Promise<CalendarEvent | null> {
  if (!base44Entities.CalendarEvent?.findOne) return null;
  return base44Entities.CalendarEvent.findOne({ where: { id } });
}
