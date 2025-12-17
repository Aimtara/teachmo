import { listEvents } from "@/domains/events";
import type { Event, ListEventsParams, Paginated } from "../types";

export async function list(params: ListEventsParams = {}): Promise<Paginated<Event>> {
  const result = await listEvents(params);

  if (Array.isArray(result)) {
    return { items: result, nextCursor: null };
  }

  return {
    items: result.items ?? [],
    nextCursor: result.nextCursor ?? null,
  };
}

export async function getById(id: string): Promise<Event | null> {
  // Optional if available in domains
  return null;
}
