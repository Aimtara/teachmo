import { useEffect, useState } from 'react';
import { User } from '@/api/entities';
import { createLogger } from '@/utils/logger';

const logger = createLogger('use-premium');

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

type PremiumUser = {
  subscription_tier?: string | null;
  [key: string]: unknown;
};

export function usePremium() {
  const [user, setUser] = useState<PremiumUser | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const currentUser = (await User.me()) as PremiumUser | null;
        setUser(currentUser);
        setIsPremium(currentUser?.subscription_tier === 'premium');
      } catch (error) {
        if (error instanceof Error) {
          const { name, message } = error;
          const anyError = error as {
            status?: number;
            statusCode?: number;
            code?: string | number;
          };
          const safeErrorInfo: Record<string, unknown> = { name, message };

          if (typeof anyError.status !== 'undefined') {
            safeErrorInfo.status = anyError.status;
          }
          if (typeof anyError.statusCode !== 'undefined') {
            safeErrorInfo.statusCode = anyError.statusCode;
          }
          if (typeof anyError.code !== 'undefined') {
            safeErrorInfo.code = anyError.code;
          }

          logger.warn(
            'Could not fetch user for premium check, assuming not premium.',
            safeErrorInfo,
          );
        } else {
          logger.warn('Could not fetch user for premium check, assuming not premium.');
        }
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUser();
  }, []);

  const checkFeatureAccess = (feature: string) => {
    if (isLoading || !isPremium) return false;
    return (feature in premiumFeatures) ? premiumFeatures[feature as PremiumFeature] : false;
  };

  const getRemainingFreeRecommendations = () => {
    if (isPremium) return Number.POSITIVE_INFINITY;
    return 5;
  };

  return {
    user,
    isPremium,
    isLoading,
    checkFeatureAccess,
    getRemainingFreeRecommendations,
  };
}
