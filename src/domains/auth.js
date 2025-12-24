import { graphqlRequest } from '@/lib/graphql';

export async function fetchUserProfile(userId) {
  const query = `query GetProfile($userId: uuid!) {
    user_profiles_by_pk(user_id: $userId) {
      user_id
      full_name
      role
      district_id
      school_id
      first_name
      last_name
      phone
      city
      notes
      children_count
    }
  }`;
  const data = await graphqlRequest({ query, variables: { userId } });
  return data?.user_profiles_by_pk || null;
}

export async function createProfile(input) {
  const query = `mutation InsertProfile($input: user_profiles_insert_input!) {
    insert_user_profiles_one(object: $input) {
      user_id
      full_name
      role
      district_id
      school_id
      first_name
      last_name
      phone
      city
      notes
      children_count
    }
  }`;
  const data = await graphqlRequest({ query, variables: { input } });
  return data?.insert_user_profiles_one;
}
