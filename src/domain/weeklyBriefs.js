import { base44Entities } from '@/api/base44';

const { WeeklyBrief } = base44Entities;

function buildFilters({ weekStart } = {}) {
  if (!weekStart) return {};
  return { week_start: weekStart };
}

export const weeklyBriefsApi = {
  entity: WeeklyBrief,
  async list({ weekStart } = {}) {
    const filters = buildFilters({ weekStart });
    const hasFilters = Object.keys(filters).length > 0;

    if (!WeeklyBrief?.filter || !WeeklyBrief?.list) return [];

    if (hasFilters) {
      return WeeklyBrief.filter(filters, '-published_at');
    }

    return WeeklyBrief.list('-published_at');
  },
  async get(id) {
    if (!WeeklyBrief?.get) return null;
    return WeeklyBrief.get(id);
  },
  async logView(id, source = 'dashboard') {
    if (!WeeklyBrief?.update || !WeeklyBrief?.get) return null;

    const row = await WeeklyBrief.get(id);
    const viewCount = Number(row?.view_count || 0) + 1;

    return WeeklyBrief.update(id, {
      view_count: viewCount,
      last_viewed_at: new Date().toISOString(),
      last_viewed_source: source
    });
  }
};
