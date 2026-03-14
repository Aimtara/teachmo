import { apiClient } from '@/services/core/client';
import type { WeeklyBriefListFilters, WeeklyBriefRecord } from '@/domain/types/weeklyBrief';

function buildFilters({ weekStart }: WeeklyBriefListFilters = {}) {
  if (!weekStart) return {};
  return { week_start: weekStart };
}

export const weeklyBriefsApi = {
  entity: {
    list: (params?: Record<string, unknown>) => apiClient.entity.list<WeeklyBriefRecord>('WeeklyBrief', params),
    filter: (params?: Record<string, unknown>) => apiClient.entity.filter<WeeklyBriefRecord>('WeeklyBrief', params),
    get: (id: string) => apiClient.entity.get<WeeklyBriefRecord>('WeeklyBrief', id),
    update: (id: string, payload: Record<string, unknown>) =>
      apiClient.entity.update<WeeklyBriefRecord>('WeeklyBrief', id, payload)
  },
  async list({ weekStart }: WeeklyBriefListFilters = {}): Promise<WeeklyBriefRecord[]> {
    const filters = buildFilters({ weekStart });
    const hasFilters = Object.keys(filters).length > 0;

    if (hasFilters) {
      return apiClient.entity.filter<WeeklyBriefRecord>('WeeklyBrief', { ...filters, sort: '-published_at' });
    }

    return apiClient.entity.list<WeeklyBriefRecord>('WeeklyBrief', { sort: '-published_at' });
  },
  async get(id: string): Promise<WeeklyBriefRecord | null> {
    return apiClient.entity.get<WeeklyBriefRecord>('WeeklyBrief', id);
  },
  async logView(id: string, source = 'dashboard') {
    const row: WeeklyBriefRecord | null = await apiClient.entity.get<WeeklyBriefRecord>('WeeklyBrief', id);
    if (!row) return null;

    const openCount = Number(row?.open_count || 0) + 1;
    const openedAt = row?.opened_at || new Date().toISOString();

    return apiClient.entity.update<WeeklyBriefRecord>('WeeklyBrief', id, {
      open_count: openCount,
      opened_at: openedAt,
      last_opened_at: new Date().toISOString(),
      last_opened_source: source
    });
  }
};
