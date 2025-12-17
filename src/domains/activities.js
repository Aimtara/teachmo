import { graphqlRequest } from '@/lib/graphql';

const ACTIVITY_FIELDS = `
  id
  title
  description
  subject
  grade_level
  category
  status
  duration
  materials_needed
  why_it_matters
  teachmo_tip
  learning_objectives
  created_at
`;

function normalizeActivitiesListParams(params = {}) {
  if (!params || typeof params !== 'object') {
    return { where: undefined, limit: undefined, offset: undefined, order_by: [{ created_at: 'desc' }] };
  }

  const { where, filter, order_by, orderBy, limit, offset } = params;
  const remaining = { ...params };

  delete remaining.where;
  delete remaining.filter;
  delete remaining.order_by;
  delete remaining.orderBy;
  delete remaining.limit;
  delete remaining.offset;

  const derivedWhere = where ?? filter ?? (Object.keys(remaining).length ? remaining : undefined);

  return {
    where: derivedWhere,
    limit: typeof limit === 'number' ? limit : undefined,
    offset: typeof offset === 'number' ? offset : undefined,
    order_by: buildOrderBy(order_by ?? orderBy) ?? [{ created_at: 'desc' }]
  };
}

function buildOrderBy(order) {
  if (!order) return undefined;
  if (Array.isArray(order)) return order;
  if (typeof order === 'string') {
    const trimmed = order.trim();
    if (!trimmed) return undefined;
    const isDesc = trimmed.startsWith('-');
    const field = isDesc ? trimmed.slice(1) : trimmed;
    if (!field) return undefined;
    return [{ [field]: isDesc ? 'desc' : 'asc' }];
  }
  if (typeof order === 'object') return [order];
  return undefined;
}

export async function listActivities(params = {}) {
  const { where, limit, offset, order_by } = normalizeActivitiesListParams(params);

  const query = `query Activities($where: activities_bool_exp, $limit: Int, $offset: Int, $order_by: [activities_order_by!]) {
    activities(where: $where, limit: $limit, offset: $offset, order_by: $order_by) {
      ${ACTIVITY_FIELDS}
    }
  }`;

  const variables = {
    where: where && Object.keys(where).length ? where : undefined,
    limit,
    offset,
    order_by
  };

  const data = await graphqlRequest({ query, variables });
  return data?.activities || [];
}

export async function getActivity(id) {
  if (!id) return null;

  const query = `query Activity($id: uuid!) {
    activities_by_pk(id: $id) {
      ${ACTIVITY_FIELDS}
    }
  }`;

  const data = await graphqlRequest({ query, variables: { id } });
  return data?.activities_by_pk ?? null;
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
