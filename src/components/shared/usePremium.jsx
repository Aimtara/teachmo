import { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { createLogger } from '@/utils/logger';

const logger = createLogger('shared-use-premium');

export function usePremium() {
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setIsPremium(currentUser?.subscription_tier === 'premium');
      } catch (error) {
        logger.error('Error fetching user', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const checkFeatureAccess = (feature) => {
    const premiumFeatures = {
      unlimited_recommendations: isPremium,
      advanced_analytics: isPremium,
      custom_activities: isPremium,
      premium_content: isPremium,
      family_collaboration: isPremium,
      export_data: isPremium,
      priority_support: isPremium
    };

    return premiumFeatures[feature] || false;
  };

  const getRemainingFreeRecommendations = () => {
    // Mock implementation - in real app, track daily usage
    const dailyLimit = 3;
    const usedToday = 0; // Would be tracked in user data
    return Math.max(0, dailyLimit - usedToday);
  };

  return {
    user,
    isPremium,
    isLoading,
    checkFeatureAccess,
    getRemainingFreeRecommendations
  };
}
