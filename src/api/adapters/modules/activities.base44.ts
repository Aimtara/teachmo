import * as base44Entities from '@/api/base44/entities';
import type { Activity, Paginated } from '../types';

export async function list(params: Record<string, unknown> = {}): Promise<Paginated<Activity>> {
  const items = await base44Entities.Activity?.findMany?.(params);
  return { items: items ?? [], nextCursor: null };
}

export async function getById(id: string): Promise<Activity | null> {
  if (!base44Entities.Activity?.findOne) return null;
  return base44Entities.Activity.findOne({ where: { id } });
}
