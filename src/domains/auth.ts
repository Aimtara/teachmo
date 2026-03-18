import { graphqlRequest } from '@/lib/graphql';
import { GraphQLRequestError } from '@/lib/hasuraErrors';

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


function isRecoverableProfileLookupError(error: unknown) {
  if (error instanceof GraphQLRequestError) {
    return ['permission', 'validation', 'unknown'].includes(error.normalized.kind);
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  return (
    message.includes('permission') ||
    message.includes('field') ||
    message.includes('relation') ||
    message.includes('column')
  );
}

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

  const legacyQuery = `query GetLegacyProfile($userId: uuid!) {
    user_profiles_by_pk(user_id: $userId) {
      user_id
      full_name
      role
      district_id
      school_id
    }
  }`;

  try {
    const data = await graphqlRequest<GetProfileData>({ query: profileQuery, variables: { userId } });
    const profile = data?.profiles?.[0] || null;
    if (profile) return profile;
  } catch (error) {
    // Fall through to legacy profile lookup for deployments still relying on user_profiles
    // or when permissions/schema for profiles are not available to the current role.
    if (!isRecoverableProfileLookupError(error)) {
      throw error;
    }
  }

  const legacyData = await graphqlRequest<{ user_profiles_by_pk?: {
    user_id: string;
    full_name: string;
    role: string;
    district_id: string;
    school_id: string;
  } | null }>({ query: legacyQuery, variables: { userId } });

  const legacy = legacyData?.user_profiles_by_pk ?? null;
  if (!legacy) return null;

  return {
    id: legacy.user_id,
    user_id: legacy.user_id,
    full_name: legacy.full_name,
    app_role: legacy.role,
    organization_id: legacy.district_id,
    school_id: legacy.school_id,
  };
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
