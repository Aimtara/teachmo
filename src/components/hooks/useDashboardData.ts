import { useCallback, useEffect, useState } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { ParentingTip } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';
import backendAdapter from '@/backend/adapter';
import type { ActivitySummary, BackendUser, ChildProfile } from '@/backend/types';

type ParentingTipItem = {
  is_read?: boolean;
  [key: string]: unknown;
};

type WeeklyStats = {
  activitiesCompleted: number;
  activitiesPlanned: number;
  streak: number;
  tipProgress: number;
  totalTips: number;
};

type DashboardData = {
  user: BackendUser | null;
  children: ChildProfile[];
  activities: ActivitySummary[];
  tips: ParentingTipItem[];
  weeklyStats: WeeklyStats;
};

const defaultWeeklyStats: WeeklyStats = {
  activitiesCompleted: 0,
  activitiesPlanned: 0,
  streak: 0,
  tipProgress: 0,
  totalTips: 0,
};

const defaultDashboardData: DashboardData = {
  user: null,
  children: [],
  activities: [],
  tips: [],
  weeklyStats: defaultWeeklyStats,
};

export function useDashboardData() {
  const { execute, isLoading, error, loadingStates } = useApi({ context: 'dashboard' });
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultDashboardData);

  const calculateWeeklyStats = (
    activities: ActivitySummary[] = [],
    tips: ParentingTipItem[] = [],
    user: BackendUser | null = null,
  ): WeeklyStats => {
    try {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());

      const weeklyCompleted = activities.filter(
        (activity) =>
          activity?.status === 'completed' &&
          Boolean(activity.completion_date) &&
          new Date(activity.completion_date as string) >= weekStart &&
          new Date(activity.completion_date as string) <= weekEnd,
      ).length;

      const planned = activities.filter((activity) => activity?.status === 'planned').length;
      const readTips = tips.filter((tip) => tip?.is_read).length;

      return {
        activitiesCompleted: weeklyCompleted,
        activitiesPlanned: planned,
        streak: Number((user as { login_streak?: number } | null)?.login_streak ?? 0),
        tipProgress: readTips,
        totalTips: tips.length,
      };
    } catch (calcError) {
      console.error('Error calculating weekly stats:', calcError);
      return defaultWeeklyStats;
    }
  };

  const loadData = useCallback(async () => {
    try {
      const user = (await execute(() => backendAdapter.getCurrentUser(), { key: 'user' })) as BackendUser | null;
      if (!user) return;

      const [children, activities, activitiesForStats, tips] = await Promise.all([
        execute(() => backendAdapter.listChildren(), { key: 'children' }).catch(() => [] as ChildProfile[]),
        execute(() => backendAdapter.listActivities({ excludeStatus: 'completed', limit: 10 }), {
          key: 'activities',
        }).catch(() => [] as ActivitySummary[]),
        execute(() => backendAdapter.listActivities({ limit: 50 }), {
          key: 'activitiesStats',
        }).catch(() => [] as ActivitySummary[]),
        execute(() => ParentingTip.list('-created_date', 5), { key: 'tips' }).catch(
          () => [] as ParentingTipItem[],
        ),
      ]);

      const safeChildren = Array.isArray(children) ? (children as ChildProfile[]) : [];
      const safeActivities = Array.isArray(activities) ? (activities as ActivitySummary[]) : [];
      const safeActivitiesForStats = Array.isArray(activitiesForStats)
        ? (activitiesForStats as ActivitySummary[])
        : [];
      const safeTips = Array.isArray(tips) ? (tips as ParentingTipItem[]) : [];

      setDashboardData({
        user,
        children: safeChildren,
        activities: safeActivities,
        tips: safeTips,
        weeklyStats: calculateWeeklyStats(safeActivitiesForStats, safeTips, user),
      });
    } catch (loadError) {
      console.error('Error loading dashboard data:', loadError);
      setDashboardData(defaultDashboardData);
    }
  }, [execute]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const isOverallLoading =
    isLoading('user') || isLoading('children') || isLoading('activities') || isLoading('tips');

  return {
    data: dashboardData,
    isLoading: isOverallLoading,
    error,
    loadingStates,
    reload: loadData,
  };
}
