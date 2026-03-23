import { graphqlRequest } from '@/lib/graphql';
import { isRecoverableProfileLookupError } from '@/lib/hasuraErrors';

type ProfileInput = Record<string, unknown>;

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  app_role: string;
  organization_id: string;
  school_id: string;
};

type GetProfileData = { profiles?: Profile[] };
type InsertProfileData = { insert_profiles_one?: Profile };
type UpdateProfilesData = {
  update_profiles?: {
    affected_rows: number;
    returning: Array<{ id: string; user_id: string; app_role: string }>;
  };
};

export async function fetchUserProfile(userId: string) {
  const profileQuery = `query GetProfile($userId: uuid!) {
    profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
      id
      user_id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;

  try {
    const data = await graphqlRequest<GetProfileData>({ query: profileQuery, variables: { userId } });
    const profile = data?.profiles?.[0] || null;
    if (profile) return profile;
    return null;
  } catch (error) {
    if (!isRecoverableProfileLookupError(error)) {
      throw error;
    }
    return null;
  }
}

export async function createProfile(input: ProfileInput) {
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
  const data = await graphqlRequest<InsertProfileData>({ query, variables: { input } });
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
export async function reconcileProfileRole(userId: string | null | undefined, appRole: string | null | undefined) {
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

  const data = await graphqlRequest<UpdateProfilesData>({
    query,
    variables: { userId, appRole },
  });

  return data?.update_profiles?.returning?.[0] ?? null;
}
