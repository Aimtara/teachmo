import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@nhost/react';
import { getMyProfile, type Profile } from '@/domains/profile';

export function useMyProfile() {
  const authUser = useUserData();
  const userId = authUser?.id ?? null;

  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      return getMyProfile(userId);
    },
  });
}
