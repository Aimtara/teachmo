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
  organizationId,
  schoolId,
  allowTenantWrite = false
}) {
  if (!userId) throw new Error('Missing userId');
  if (!fullName) throw new Error('Missing fullName');

  const insertQuery = `mutation InsertMyProfile($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;

  try {
    const insertData = await graphqlRequest({
      query: insertQuery,
      variables: { input: { full_name: fullName } }
    });

    if (insertData?.insert_profiles_one) {
      return insertData.insert_profiles_one;
    }
  } catch (error) {
    // Fall through to update when the profile already exists.
  }

  const updateQuery = allowTenantWrite
    ? `mutation UpdateMyProfileTenant($userId: uuid!, $fullName: String!, $orgId: uuid, $schoolId: uuid) {
        update_profiles(
          where: { user_id: { _eq: $userId } }
          _set: { full_name: $fullName, organization_id: $orgId, school_id: $schoolId }
        ) {
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
    : `mutation UpdateMyProfileBasics($userId: uuid!, $fullName: String!) {
        update_profiles(
          where: { user_id: { _eq: $userId } }
          _set: { full_name: $fullName }
        ) {
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
    ? { userId, fullName, orgId: organizationId ?? null, schoolId: schoolId ?? null }
    : { userId, fullName };

  const updateData = await graphqlRequest({
    query: updateQuery,
    variables: updateVars
  });

  return updateData?.update_profiles?.returning?.[0] ?? null;
}
