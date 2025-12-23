import { listEvents } from "@/domains/events";
import type { Event, Paginated } from "../types";

export async function list(params: Record<string, any> = {}): Promise<Paginated<Event>> {
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
  // TODO: Implement getById when domain function is available
  throw new Error(`getById(${id}) is not yet implemented for GraphQL events adapter`);
}
