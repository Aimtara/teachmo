import { graphqlRequest } from '@/lib/graphql';

export type TeacherDashboardData = {
  classrooms?: unknown[];
  events?: unknown[];
  assignments?: unknown[];
};

export async function getTeacherDashboardSummary(): Promise<TeacherDashboardData> {
  const query = `query TeacherDashboard($eventsLimit: Int, $assignmentsLimit: Int) {
    classrooms(order_by: { name: asc }) {
      id
      name
    }
    events(order_by: { starts_at: asc }, limit: $eventsLimit) {
      id
      title
      starts_at
      classroom {
        name
      }
    }
    assignments(
      order_by: { due_at: asc },
      limit: $assignmentsLimit,
      where: { status: { _eq: "active" } }
    ) {
      id
      title
      due_at
      classroom {
        name
      }
      submissions_aggregate {
        aggregate {
          count
        }
      }
    }
  }`;

  return graphqlRequest<TeacherDashboardData>({ query, variables: { eventsLimit: 5, assignmentsLimit: 5 } });
}
