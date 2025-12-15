import { graphqlRequest } from '@/lib/graphql';

export async function createEvent(input) {
  const query = `mutation CreateEvent($input: events_insert_input!) {
    insert_events_one(object: $input) {
      id
      title
      starts_at
      classroom_id
    }
  }`;
  return graphqlRequest({ query, variables: { input } });
}

export async function listEvents(schoolId) {
  const query = `query Events($schoolId: uuid!) {
    events(where: { school_id: { _eq: $schoolId } }, order_by: { starts_at: asc }) {
      id
      title
      description
      starts_at
      ends_at
      classroom_id
    }
  }`;
  const data = await graphqlRequest({ query, variables: { schoolId } });
  return data?.events || [];
}
