import { listEvents } from "@/domains/events";
import type { Event, Paginated } from "../types";

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Event>> {
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
  void id;
  return null;
}
