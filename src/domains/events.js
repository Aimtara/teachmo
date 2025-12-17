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

export async function listEvents(params = {}) {
  const normalizedParams = params && typeof params === 'object' && !Array.isArray(params)
    ? params
    : { schoolId: params };

  const schoolId = normalizedParams.schoolId ?? normalizedParams.school_id ?? null;
  const limit = normalizedParams.limit ?? 50;
  const offset = normalizedParams.offset ?? 0;
  const hasSchoolFilter = Boolean(schoolId);

  const query = `query Events(${hasSchoolFilter ? '$schoolId: uuid!, ' : ''}$limit: Int, $offset: Int) {
    events(
      ${hasSchoolFilter ? 'where: { school_id: { _eq: $schoolId } },' : ''}
      order_by: { starts_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      title
      description
      starts_at
      ends_at
      classroom_id
      school_id
    }
  }`;

  const variables = { limit, offset, ...(hasSchoolFilter ? { schoolId } : {}) };
  const data = await graphqlRequest({ query, variables });
  return data?.events || [];
}
