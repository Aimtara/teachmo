import { useEffect, useState } from 'react';
import { User } from '@/api/entities';
import { createLogger } from '@/utils/logger';

const logger = createLogger('shared-use-premium');

type PremiumUser = {
  subscription_tier?: string | null;
  [key: string]: unknown;
};

const premiumFeatures = {
  unlimited_recommendations: true,
  advanced_analytics: true,
  custom_activities: true,
  premium_content: true,
  family_collaboration: true,
  export_data: true,
  priority_support: true,
} as const;

type PremiumFeature = keyof typeof premiumFeatures;

export function usePremium() {
  const [user, setUser] = useState<PremiumUser | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = (await User.me()) as PremiumUser | null;
        setUser(currentUser);
        setIsPremium(currentUser?.subscription_tier === 'premium');
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error fetching user: ${safeMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUser();
  }, []);

  const checkFeatureAccess = (feature: string) => {
    if (!isPremium || !(feature in premiumFeatures)) {
      return false;
    }

    return premiumFeatures[feature as PremiumFeature];
  };

  const getRemainingFreeRecommendations = () => {
    const dailyLimit = 3;
    const usedToday = 0;
    return Math.max(0, dailyLimit - usedToday);
  };

  return {
    user,
    isPremium,
    isLoading,
    checkFeatureAccess,
    getRemainingFreeRecommendations,
  };
}
