import { nhost } from '@/lib/nhostClient';
import { graphql } from '@/lib/graphql';
import { domainJson } from '@/domains/http';

export async function adminAnalyticsHeaders() {
  const token = await nhost.auth.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAdminAIUsageSummary(headers: Record<string, string>) {
  return domainJson('/admin/ai/usage-summary', { headers });
}

export const getAnalyticsHeaders = adminAnalyticsHeaders;
export const getAnalyticsAIUsageSummary = getAdminAIUsageSummary;

export async function listAnalyticsRollups(where: Record<string, unknown>) {
  const data = await graphql(
    `query Rollups($where: analytics_event_rollups_daily_bool_exp!) {
      analytics_event_rollups_daily(
        where: $where,
        order_by: [{ day: desc }, { event_count: desc }],
        limit: 500
      ) {
        day
        event_name
        district_id
        school_id
        event_count
      }
    }`,
    { where },
  );
  return data?.analytics_event_rollups_daily ?? [];
}

export async function listAnalyticsEvents(where: Record<string, unknown>) {
  const data = await graphql(
    `query Drill($where: analytics_events_bool_exp!) {
      analytics_events(
        where: $where,
        order_by: { event_ts: desc },
        limit: 200
      ) {
        id
        event_ts
        event_name
        actor_user_id
        entity_type
        entity_id
        metadata
      }
    }`,
    { where },
  );
  return data?.analytics_events ?? [];
}
