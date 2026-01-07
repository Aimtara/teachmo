import { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-premium');

export function usePremium() {
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setIsPremium(currentUser?.subscription_tier === 'premium');
      } catch (error) {
        logger.warn('Could not fetch user for premium check, assuming not premium.', error);
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const checkFeatureAccess = (feature) => {
    if (isLoading) return false;
    if (!isPremium) return false;

    const premiumFeatures = {
      unlimited_recommendations: true,
      advanced_analytics: true,
      custom_activities: true,
      premium_content: true,
      family_collaboration: true,
      export_data: true,
      priority_support: true,
    };

    return premiumFeatures[feature] || false;
  };

  const getRemainingFreeRecommendations = () => {
      if(isPremium) return Infinity;
      return 5; // Default free tier limit
  }

  return {
    user,
    isPremium,
    isLoading,
    checkFeatureAccess,
    getRemainingFreeRecommendations,
  };
}
