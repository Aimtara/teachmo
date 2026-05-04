import { graphqlRequest } from '@/lib/graphql';

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  app_role: string | null;
  organization_id: string | null;
  school_id: string | null;
};

type MyProfileResponse = {
  profiles?: Profile[];
};

export async function getMyProfile(userId: string): Promise<Profile | null> {
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

  const data = await graphqlRequest<MyProfileResponse>({ query, variables: { userId } });
  return data?.profiles?.[0] ?? null;
}
