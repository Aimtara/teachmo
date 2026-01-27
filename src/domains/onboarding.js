import { graphqlRequest } from '@/lib/graphql';

export async function bootstrapOrganization({ organizationName, schoolName }) {
  const query = `mutation UpsertOrg($org: organizations_insert_input!, $school: schools_insert_input!) {
    organization: insert_organizations_one(object: $org, on_conflict: { constraint: organizations_name_key, update_columns: [name] }) {
      id
      name
    }
    school: insert_schools_one(object: $school, on_conflict: { constraint: schools_organization_id_name_key, update_columns: [name, timezone] }) {
      id
      name
      organization_id
    }
  }`;

  const data = await graphqlRequest({
    query,
    variables: {
      org: { name: organizationName },
      school: { name: schoolName }
    }
  });

  return data;
}

export async function completeOnboarding({ userId, fullName, appRole, organizationId, schoolId }) {
  const query = `mutation CompleteOnboarding($input: profiles_insert_input!) {
    insert_profiles_one(object: $input) {
      id
      user_id
      full_name
      app_role
      organization_id
      school_id
    }
  }`;

  const data = await graphqlRequest({
    query,
    variables: {
      input: {
        user_id: userId,
        full_name: fullName,
        app_role: appRole,
        organization_id: organizationId,
        school_id: schoolId
      }
    }
  });

  return data?.insert_profiles_one;
}
