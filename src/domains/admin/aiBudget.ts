import { graphqlRequest } from '@/lib/graphql';

export type AIBudgetSettings = {
  id?: string;
  monthly_limit_usd: number;
  alert_threshold: number;
  fallback_model: string;
};

export type AICostForecast = {
  period_start: string;
  period_end: string;
  projected_tokens: number;
  projected_cost: number;
  budget_remaining: number;
  budget_limit: number;
};

export async function getAIBudgetSettings() {
  const res = await graphqlRequest({
    query: `query AIBudgetSettings {
      ai_tenant_budgets(limit: 1) {
        id
        monthly_limit_usd
        alert_threshold
        fallback_model
      }
    }`,
  });
  return (res?.ai_tenant_budgets?.[0] ?? null) as AIBudgetSettings | null;
}

export async function updateAIBudgetSettings(input: {
  limit: number;
  threshold: number;
  model: string;
}) {
  return graphqlRequest({
    query: `mutation UpdateAIBudgetSettings($limit: numeric!, $threshold: numeric!, $model: String!) {
      update_ai_tenant_budgets(where: {}, _set: { monthly_limit_usd: $limit, alert_threshold: $threshold, fallback_model: $model }) {
        affected_rows
      }
    }`,
    variables: input,
  });
}

export async function getAICostForecast() {
  const res = await graphqlRequest({
    query: `query AICostForecast {
      ai_usage_forecast {
        period_start
        period_end
        projected_tokens
        projected_cost
        budget_remaining
        budget_limit
      }
    }`,
  });
  return (res?.ai_usage_forecast ?? null) as AICostForecast | null;
}
