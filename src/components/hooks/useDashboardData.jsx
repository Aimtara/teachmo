import { useState, useEffect, useCallback } from 'react';
import { ParentingTip } from "@/api/entities";
import { startOfWeek, endOfWeek } from 'date-fns';
import { useApi } from '@/components/hooks/useApi';
import backendAdapter from '@/backend/adapter';

export function useDashboardData() {
  const { execute, isLoading, error, loadingStates } = useApi({ context: 'dashboard' });

  const [dashboardData, setDashboardData] = useState({
    user: null,
    children: [],
    activities: [],
    tips: [],
    weeklyStats: {
      activitiesCompleted: 0,
      activitiesPlanned: 0,
      streak: 0,
      tipProgress: 0,
      totalTips: 0
    },
  });

  const calculateWeeklyStats = (activities = [], tips = [], user = null) => {
    try {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      const weeklyCompleted = Array.isArray(activities) ? activities.filter(a => 
        a && 
        a.status === 'completed' &&
        a.completion_date && 
        new Date(a.completion_date) >= weekStart && 
        new Date(a.completion_date) <= weekEnd
      ).length : 0;

      const planned = Array.isArray(activities) ? activities.filter(a => a && a.status === 'planned').length : 0;
      const readTips = Array.isArray(tips) ? tips.filter(t => t && t.is_read).length : 0;

      return {
        activitiesCompleted: weeklyCompleted,
        activitiesPlanned: planned,
        streak: user?.login_streak || 0,
        tipProgress: readTips,
        totalTips: Array.isArray(tips) ? tips.length : 0
      };
    } catch (error) {
      console.error('Error calculating weekly stats:', error);
      return {
        activitiesCompleted: 0,
        activitiesPlanned: 0,
        streak: 0,
        tipProgress: 0,
        totalTips: 0
      };
    }
  };

  const loadData = useCallback(async () => {
    try {
      // Sequentially execute API calls to avoid rate-limiting
      const user = await execute(() => backendAdapter.getCurrentUser(), { key: 'user' });
      if (!user) return; // Stop if user fails to load

      const [children, activities, tips] = await Promise.all([
        execute(() => backendAdapter.listChildren(), { key: 'children' }).catch(() => []),
        execute(
          () => backendAdapter.listActivities({ excludeStatus: 'completed', limit: 10 }),
          { key: 'activities' }
        ).catch(() => []),
        execute(() => ParentingTip.list('-created_date', 5), { key: 'tips' }).catch(() => [])
      ]);
      
      const weeklyStats = calculateWeeklyStats(activities, tips, user);

      setDashboardData({
        user,
        children: Array.isArray(children) ? children : [],
        activities: Array.isArray(activities) ? activities : [],
        tips: Array.isArray(tips) ? tips : [],
        weeklyStats,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set safe defaults even on error
      setDashboardData({
        user: null,
        children: [],
        activities: [],
        tips: [],
        weeklyStats: {
          activitiesCompleted: 0,
          activitiesPlanned: 0,
          streak: 0,
          tipProgress: 0,
          totalTips: 0
        },
      });
    }
  }, [execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const isOverallLoading = isLoading('user') || isLoading('children') || isLoading('activities') || isLoading('tips');

  return {
    data: dashboardData,
    isLoading: isOverallLoading,
    error,
    loadingStates,
    reload: loadData,
  };
}
