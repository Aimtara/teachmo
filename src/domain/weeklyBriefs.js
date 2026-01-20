import { WeeklyBrief } from '@/api/base44/legacy/entities';

export const weeklyBriefsApi = {
  list: async (params = {}) => {
    if (!WeeklyBrief?.list) return [];
    return WeeklyBrief.list(params);
  },
  get: async (id) => {
    if (!id || !WeeklyBrief?.get) return null;
    return WeeklyBrief.get(id);
  },
  logView: async () => null
};
