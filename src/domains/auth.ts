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
function isExpectedProfileQueryError(error: unknown): boolean {
  // Only swallow well-understood, permission/schema-related errors when falling back
  // to the legacy `user_profiles` table. All other errors should propagate.
  const messages: string[] = [];

  if (error && typeof error === 'object') {
    const anyError = error as any;

    if (typeof anyError.message === 'string') {
      messages.push(anyError.message);
    }

    // Handle common GraphQL error shapes: error.response.errors[].message
    const graphQLErrors = anyError.response?.errors;
    if (Array.isArray(graphQLErrors)) {
      for (const e of graphQLErrors) {
        if (e && typeof e.message === 'string') {
          messages.push(e.message);
        }
      }
    }
  }

  if (messages.length === 0) {
    return false;
  }

  const lowered = messages.join(' | ').toLowerCase();

  // Expected cases:
  // - Hasura/PG permission errors
  // - `profiles` relation not yet present in a deployment
  return (
    lowered.includes('permission denied') ||
    lowered.includes('missing required permission') ||
    lowered.includes('not authorised') ||
    lowered.includes('not authorized') ||
    lowered.includes('relation "profiles" does not exist') ||
    lowered.includes("relation 'profiles' does not exist")
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
    // Fall through to legacy profile lookup only for expected permission/schema cases.
    if (!isExpectedProfileQueryError(error)) {
      // Re-throw unexpected errors so upstream callers (e.g., TenantContext) can log them.
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
