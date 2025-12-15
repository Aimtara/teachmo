import { graphqlRequest } from '@/lib/graphql';

export async function fetchUserProfile(userId) {
  const query = `query GetProfile($userId: uuid!) {
    profiles(where: { user_id: { _eq: $userId } }) {
      id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;
  const data = await graphqlRequest({ query, variables: { userId } });
  return data?.profiles?.[0] || null;
}

export async function createProfile(input) {
  const query = `mutation InsertProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;
  const data = await graphqlRequest({ query, variables: { input } });
  return data?.insert_profiles_one;
}
