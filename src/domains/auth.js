import { graphqlRequest } from '@/lib/graphql';

export async function fetchUserProfile(userId) {
  const query = `query GetProfile($userId: uuid!) {
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
  return data?.profiles?.[0] || null;
}

export async function createProfile(input) {
  const query = `mutation InsertProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;
  const data = await graphqlRequest({ query, variables: { input } });
  return data?.insert_profiles_one;
}

/**
 * Best-effort reconcile so `profiles.app_role` matches the authenticated Hasura role.
 *
 * Why this exists:
 * - A DB trigger may create a profile with a default role (often `parent`).
 * - UI routing needs a consistent role signal.
 *
 * Hasura permissions should ensure callers can only set this to their own session role.
 */
export async function reconcileProfileRole(userId, appRole) {
  if (!userId || !appRole) return null;

  const query = `mutation ReconcileProfileRole($userId: uuid!, $appRole: String!) {
    update_profiles(where: { user_id: { _eq: $userId } }, _set: { app_role: $appRole }) {
      affected_rows
      returning {
        id
        user_id
        app_role
      }
    }
  }`;

  const data = await graphqlRequest({
    query,
    variables: { userId, appRole }
  });

  return data?.update_profiles?.returning?.[0] ?? null;
}
