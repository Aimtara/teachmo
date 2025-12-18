import { listCalendarEvents } from '@/domains/calendar';
import type { CalendarEvent, Paginated } from '../types';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<CalendarEvent>> {
  const result = await listCalendarEvents(params);

  if (Array.isArray(result)) {
    return { items: result, nextCursor: null };
  }

  return {
    items: result.items ?? [],
    nextCursor: result.nextCursor ?? null
  };
}

export async function getById(id: string): Promise<CalendarEvent | null> {
  // Optional; implement later if needed
  void id;
  return null;
}
