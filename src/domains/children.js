import { graphqlRequest } from '@/lib/graphql';

export async function addChild({ profileId, firstName, lastName, birthdate }) {
  const query = `mutation AddChild($input: children_insert_input!) {
    insert_children_one(object: $input) {
      id
      first_name
      last_name
      birthdate
    }
  }`;
  return graphqlRequest({ query, variables: { input: { profile_id: profileId, first_name: firstName, last_name: lastName, birthdate } } });
}

export async function listChildren(profileId) {
  const query = `query Children($profileId: uuid!) {
    children(where: { profile_id: { _eq: $profileId } }) {
      id
      first_name
      last_name
      birthdate
    }
  }`;
  const data = await graphqlRequest({ query, variables: { profileId } });
  return data?.children || [];
}
