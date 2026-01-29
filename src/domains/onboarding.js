import { graphqlRequest } from '@/lib/graphql';

export async function bootstrapOrganization({ organizationName, schoolName }) {
  // Only privileged roles can create organizations/schools (Hasura permissions enforce this).
  // Keep this two-step so the school always has a real organization_id.
  const orgQuery = `mutation UpsertOrganization($name: String!) {
    organization: insert_organizations_one(
      object: { name: $name }
      on_conflict: { constraint: organizations_name_key, update_columns: [name] }
    ) {
      id
      name
    }
  }`;

  const orgData = await graphqlRequest({
    query: orgQuery,
    variables: { name: organizationName }
  });

  const organization = orgData?.organization ?? null;
  if (!organization?.id) {
    return { organization: null, school: null };
  }

  const schoolQuery = `mutation UpsertSchool($orgId: uuid!, $name: String!) {
    school: insert_schools_one(
      object: { organization_id: $orgId, name: $name }
      on_conflict: { constraint: schools_organization_id_name_key, update_columns: [name, timezone] }
    ) {
      id
      name
      organization_id
    }
  }`;

  const schoolData = await graphqlRequest({
    query: schoolQuery,
    variables: { orgId: organization.id, name: schoolName }
  });

  return {
    organization,
    school: schoolData?.school ?? null
  };
}

export async function completeOnboarding({
  userId,
  fullName,
  appRole,
  organizationId,
  schoolId,
  allowTenantWrite = false,
  privilegedInsert = false
}) {
  if (!userId) throw new Error('Missing userId');
  if (!fullName) throw new Error('Missing fullName');
  if (!appRole) throw new Error('Missing appRole');

  // 1) Prefer update (works for most users since a profile row is created on auth.user insert)
  const updateQuery = allowTenantWrite
    ? `mutation UpdateMyProfileTenant($userId: uuid!, $fullName: String!, $appRole: String!, $orgId: uuid, $schoolId: uuid) {
        update_profiles(
          where: { user_id: { _eq: $userId } }
          _set: { full_name: $fullName, app_role: $appRole, organization_id: $orgId, school_id: $schoolId }
        ) {
          affected_rows
          returning {
            id
            user_id
            full_name
            app_role
            organization_id
            school_id
          }
        }
      }`
    : `mutation UpdateMyProfileBasics($userId: uuid!, $fullName: String!, $appRole: String!) {
        update_profiles(
          where: { user_id: { _eq: $userId } }
          _set: { full_name: $fullName, app_role: $appRole }
        ) {
          affected_rows
          returning {
            id
            user_id
            full_name
            app_role
            organization_id
            school_id
          }
        }
      }`;

  const updateVars = allowTenantWrite
    ? { userId, fullName, appRole, orgId: organizationId ?? null, schoolId: schoolId ?? null }
    : { userId, fullName, appRole };

  const updateData = await graphqlRequest({
    query: updateQuery,
    variables: updateVars
  });

  const updated = updateData?.update_profiles?.returning?.[0] ?? null;
  if (updated) return updated;

  // 2) Fallback insert (rare but useful if trigger/seed didn't create a row)
  const insertQuery = privilegedInsert
    ? `mutation InsertMyProfilePrivileged($input: profiles_insert_input!) {
        insert_profiles_one(object: $input) {
          id
          user_id
          full_name
          app_role
          organization_id
          school_id
        }
      }`
    : `mutation InsertMyProfile($input: profiles_insert_input!) {
        insert_profiles_one(object: $input) {
          id
          user_id
          full_name
          app_role
          organization_id
          school_id
        }
      }`;

  const insertInput = privilegedInsert
    ? {
        user_id: userId,
        full_name: fullName,
        app_role: appRole,
        organization_id: organizationId ?? null,
        school_id: schoolId ?? null
      }
    : {
        // user_id / org_id / school_id are set via Hasura permission presets for non-privileged roles.
        full_name: fullName,
        app_role: appRole
      };

  const insertData = await graphqlRequest({
    query: insertQuery,
    variables: { input: insertInput }
  });

  return insertData?.insert_profiles_one ?? null;
}
