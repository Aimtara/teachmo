import { graphqlRequest } from '@/lib/graphql';

function buildCalendarWhere(params = {}) {
  const { from, to, where, filter, limit, offset, order_by, orderBy, ...rest } = params || {};
  const clauses = [];

  const baseFilter = where ?? filter ?? (Object.keys(rest).length ? rest : undefined);
  if (baseFilter) clauses.push(baseFilter);
  if (from) clauses.push({ start_time: { _gte: from } });
  if (to) clauses.push({ end_time: { _lte: to } });

  if (!clauses.length) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { _and: clauses };
}

export async function listCalendarEvents(params = {}) {
  const query = `
    query ListCalendarEvents($where: calendar_events_bool_exp, $limit: Int, $offset: Int, $order_by: [calendar_events_order_by!]) {
      calendar_events(
        where: $where,
        limit: $limit,
        offset: $offset,
        order_by: $order_by
      ) {
        id
        title
        description
        start_time
        end_time
        location
        all_day
        created_by
      }
    }
  `;

  const variables = {
    where: buildCalendarWhere(params),
    limit: typeof params.limit === 'number' ? params.limit : 200,
    offset: typeof params.offset === 'number' ? params.offset : 0,
    order_by: params.order_by ?? params.orderBy ?? [{ start_time: 'asc' }]
  };

  const data = await graphqlRequest({ query, variables });
  return data?.calendar_events ?? [];
}
