import { graphqlRequest } from '@/lib/graphql';

export async function listActivities() {
  const query = `query Activities {
    activities(order_by: { created_at: desc }) {
      id
      title
      subject
      grade_level
    }
  }`;
  const data = await graphqlRequest({ query });
  return data?.activities || [];
}

export async function fetchLibraryItems(activityId) {
  const query = `query LibraryItems($id: uuid!) {
    library_items(where: { activity_id: { _eq: $id } }) {
      id
      url
      format
    }
  }`;
  const data = await graphqlRequest({ query, variables: { id: activityId } });
  return data?.library_items || [];
}
