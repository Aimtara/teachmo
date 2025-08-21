import { useState, useEffect } from 'react';
import { User } from '@/api/entities';

// Smart defaults based on user behavior and preferences
export const useSmartDefaults = () => {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({});

  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        // Extract smart defaults from user data
        const smartPreferences = {
          // Time preferences based on past activity completions
          preferredTimeOfDay: userData.scheduling_preferences?.preferred_time || 'morning',
          
          // Activity preferences based on completion history
          preferredActivityTypes: userData.activity_preferences?.categories || ['creative', 'educational'],
          
          // Notification preferences
          notificationTiming: userData.notification_preferences?.best_time || '18:00',
          
          // Child-specific defaults
          defaultChildAge: userData.children?.[0]?.age || 5,
          
          // Calendar preferences
          calendarSync: userData.calendar_sync_preference || 'google',
          
          // Dashboard layout preferences
          dashboardLayout: userData.dashboard_preferences?.layout || 'comprehensive'
        };
        
        setPreferences(smartPreferences);
      } catch (error) {
        console.error('Error loading user preferences:', error);
        // Fallback to sensible defaults
        setPreferences({
          preferredTimeOfDay: 'morning',
          preferredActivityTypes: ['creative', 'educational'],
          notificationTiming: '18:00',
          defaultChildAge: 5,
          calendarSync: 'google',
          dashboardLayout: 'comprehensive'
        });
      }
    };

    loadUserPreferences();
  }, []);

  const updatePreference = async (key, value) => {
    try {
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);
      
      // Update user data with new preference
      await User.updateMyUserData({
        smart_preferences: updatedPreferences
      });
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  };

  return {
    preferences,
    updatePreference,
    user
  };
};

// Hook for activity form defaults
export const useActivityDefaults = (childId) => {
  const { preferences } = useSmartDefaults();
  
  return {
    defaultTime: preferences.preferredTimeOfDay === 'morning' ? '09:00' : '15:00',
    defaultDuration: '30 minutes',
    defaultCategories: preferences.preferredActivityTypes,
    defaultChild: childId
  };
};

// Hook for notification defaults
export const useNotificationDefaults = () => {
  const { preferences } = useSmartDefaults();
  
  return {
    defaultChannels: ['in_app', 'email'],
    defaultTiming: preferences.notificationTiming,
    batchNotifications: true,
    quietHours: { start: '21:00', end: '07:00' }
  };
};

// Context for dashboard personalization
export const useDashboardPersonalization = () => {
  const { preferences, updatePreference } = useSmartDefaults();
  
  const getPersonalizedLayout = () => {
    if (preferences.dashboardLayout === 'simple') {
      return {
        showWeeklyProgress: false,
        showEmotionalCheckin: false,
        showOffers: false,
        focusOnToday: true
      };
    }
    
    return {
      showWeeklyProgress: true,
      showEmotionalCheckin: true,
      showOffers: true,
      focusOnToday: false
    };
  };
  
  const toggleSimpleMode = () => {
    const newLayout = preferences.dashboardLayout === 'simple' ? 'comprehensive' : 'simple';
    updatePreference('dashboardLayout', newLayout);
  };
  
  return {
    layout: getPersonalizedLayout(),
    isSimpleMode: preferences.dashboardLayout === 'simple',
    toggleSimpleMode
  };
};