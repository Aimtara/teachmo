import { base44Entities } from "@/api/base44";
import type { Event, Paginated } from "../types";

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Event>> {
  const items = await base44Entities.Event?.findMany?.(params);
  return { items: items ?? [], nextCursor: null };
}

export async function getById(id: string): Promise<Event | null> {
  if (!base44Entities.Event?.findOne) return null;
  return base44Entities.Event.findOne({ where: { id } });
}
