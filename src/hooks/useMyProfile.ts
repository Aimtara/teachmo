import { useQuery } from '@tanstack/react-query';
import { useUserData } from '@nhost/react';
import { graphqlRequest } from '@/lib/graphql';

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  app_role: string | null;
  organization_id: string | null;
  school_id: string | null;
};

export function useMyProfile() {
  const authUser = useUserData();
  const userId = authUser?.id ?? null;

  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const query = `query MyProfile($userId: uuid!) {
        profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
          id
          user_id
          full_name
          app_role
          organization_id
          school_id
        }
      }`;
      const data = await graphqlRequest({ query, variables: { userId } });
      const profile = data?.profiles?.[0] ?? null;
      return profile;
    },
  });
}
