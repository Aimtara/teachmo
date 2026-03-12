import { graphqlRequest } from '@/lib/graphql';

type AddChildInput = {
  profileId: string;
  firstName: string;
  lastName: string;
  birthdate?: string | null;
};

export async function addChild({ profileId, firstName, lastName, birthdate }: AddChildInput) {
  const query = `mutation AddChild($input: children_insert_input!) {
    insert_children_one(object: $input) {
      id
      first_name
      last_name
      birthdate
    }
  }`;

  return graphqlRequest({
    query,
    variables: {
      input: {
        profile_id: profileId,
        first_name: firstName,
        last_name: lastName,
        birthdate,
      },
    },
  });
}

export async function listChildren(profileId: string) {
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
