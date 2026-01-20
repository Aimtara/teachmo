import { base44Entities } from '@/api/base44';
import type { WeeklyBriefListFilters, WeeklyBriefRecord } from '@/domain/types/weeklyBrief';

const { WeeklyBrief } = base44Entities;

function buildFilters({ weekStart }: WeeklyBriefListFilters = {}) {
  if (!weekStart) return {};
  return { week_start: weekStart };
}

export const weeklyBriefsApi = {
  entity: WeeklyBrief,
  async list({ weekStart }: WeeklyBriefListFilters = {}): Promise<WeeklyBriefRecord[]> {
    const filters = buildFilters({ weekStart });
    const hasFilters = Object.keys(filters).length > 0;

    if (!WeeklyBrief?.filter || !WeeklyBrief?.list) return [];

    if (hasFilters) {
      return WeeklyBrief.filter(filters, '-published_at');
    }

    return WeeklyBrief.list('-published_at');
  },
  async get(id: string): Promise<WeeklyBriefRecord | null> {
    if (!WeeklyBrief?.get) return null;
    return WeeklyBrief.get(id);
  },
  async logView(id: string, source = 'dashboard') {
    if (!WeeklyBrief?.update || !WeeklyBrief?.get) return null;

    const row: WeeklyBriefRecord | null = await WeeklyBrief.get(id);
    const openCount = Number(row?.open_count || 0) + 1;
    const openedAt = row?.opened_at || new Date().toISOString();

    return WeeklyBrief.update(id, {
      open_count: openCount,
      opened_at: openedAt,
      last_opened_at: new Date().toISOString(),
      last_opened_source: source,
    });
  },
};
