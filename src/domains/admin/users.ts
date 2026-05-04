import { graphql } from '@/lib/graphql';
import { nhost } from '@/lib/nhostClient';

const LIST_USER_PROFILES_QUERY = `
query ListUserProfiles($where: user_profiles_bool_exp, $limit: Int!, $offset: Int!) {
  user_profiles(where: $where, limit: $limit, offset: $offset, order_by: { created_at: desc }) {
    user_id
    role
    district_id
    school_id
    full_name
    created_at
  }
  user_profiles_aggregate(where: $where) { aggregate { count } }
}
`;

const UPDATE_USER_PROFILE_MUTATION = `
mutation UpdateUserProfile($userId: uuid!, $changes: user_profiles_set_input!) {
  update_user_profiles_by_pk(pk_columns: { user_id: $userId }, _set: $changes) {
    user_id
    role
    district_id
    school_id
    full_name
  }
}
`;

export type ListUserProfilesVariables = {
  where: Record<string, unknown>;
  limit: number;
  offset: number;
};

export function listUserProfiles(variables: ListUserProfilesVariables) {
  return graphql(LIST_USER_PROFILES_QUERY, variables);
}

export function updateUserProfile(variables: { userId: string; changes: Record<string, unknown> }) {
  return graphql(UPDATE_USER_PROFILE_MUTATION, variables);
}

export async function startUserImpersonation(userId: string) {
  const token = await nhost.auth.getAccessToken();
  const response = await fetch('/api/admin/impersonations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to start impersonation');
  }
  return response.json();
}
