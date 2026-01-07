import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, LoadingSpinner } from '@/components/ui';

/**
 * AdminAICostForecast provides a simple forecast of AI usage and cost for the
 * current billing period based on historical data. The forecast estimates
 * total token usage, cost and remaining budget to help administrators plan
 * ahead. A more sophisticated forecasting engine could be built on top of
 * this foundation in the future.
 */
export default function AdminAICostForecast() {
  const { data, isLoading } = useQuery(
    ['aiCostForecast'],
    async () => {
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
      return res?.ai_usage_forecast ?? null;
    },
  );

  if (isLoading || !data) return <LoadingSpinner />;

  const { period_start, period_end, projected_tokens, projected_cost, budget_remaining, budget_limit } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">AI Cost Forecast</h1>
      <p className="text-gray-600 max-w-2xl">
        Based on your organisation’s usage so far in this billing period, we
        estimate your total token consumption and cost by period end. Use this
        information to adjust budgets, policies or usage patterns.
      </p>
      <Card>
        <Table>
          <tbody>
            <tr>
              <th>Period Start</th>
              <td>{new Date(period_start).toLocaleDateString()}</td>
            </tr>
            <tr>
              <th>Period End</th>
              <td>{new Date(period_end).toLocaleDateString()}</td>
            </tr>
            <tr>
              <th>Projected Tokens</th>
              <td>{projected_tokens.toLocaleString()}</td>
            </tr>
            <tr>
              <th>Projected Cost (USD)</th>
              <td>{projected_cost.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Budget Remaining (USD)</th>
              <td>{budget_remaining.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Budget Limit (USD)</th>
              <td>{budget_limit.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Projected Overrun (USD)</th>
              <td>
                {projected_cost > budget_limit
                  ? (projected_cost - budget_limit).toFixed(2)
                  : '—'}
              </td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

