import { graphqlRequest } from '@/lib/graphql';

export type AdminDashboardMetrics = {
  organizations_aggregate?: { aggregate?: { count?: number | null } | null } | null;
  schools_aggregate?: { aggregate?: { count?: number | null } | null } | null;
  profiles_aggregate?: { aggregate?: { count?: number | null } | null } | null;
  classrooms_aggregate?: { aggregate?: { count?: number | null } | null } | null;
};

const ADMIN_DASHBOARD_METRICS_QUERY = `query AdminDashboardMetrics {
  organizations_aggregate {
    aggregate {
      count
    }
  }
  schools_aggregate {
    aggregate {
      count
    }
  }
  profiles_aggregate {
    aggregate {
      count
    }
  }
  classrooms_aggregate {
    aggregate {
      count
    }
  }
}`;

export function getAdminDashboardMetrics() {
  return graphqlRequest({
    query: ADMIN_DASHBOARD_METRICS_QUERY,
  }) as Promise<AdminDashboardMetrics>;
}
