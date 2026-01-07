import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Input, Select, Button, LoadingSpinner } from '@/components/ui';
import { toast } from 'react-toastify';

/**
 * AdminAIBudgetSettings allows administrators to configure overall AI spend
 * settings for their organisation. They can set monthly budgets per tenant,
 * define alert thresholds (e.g. percentage of budget spent) and choose a
 * fallback model to use when budgets are exceeded. This complements the
 * per‑role budgets managed in AdminRoleBudgets.
 */
export default function AdminAIBudgetSettings() {
  // Fetch current budget settings
  const {
    data: settings,
    isLoading,
    refetch,
  } = useQuery(
    ['aiBudgetSettings'],
    async () => {
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
      return res?.ai_tenant_budgets?.[0] ?? null;
    },
  );

  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [threshold, setThreshold] = useState('');
  const [fallbackModel, setFallbackModel] = useState('');

  // Save settings
  const saveSettings = useMutation(
    async () => {
      const variables = {
        limit: monthlyLimit !== '' ? parseFloat(monthlyLimit) : settings.monthly_limit_usd,
        threshold: threshold !== '' ? parseFloat(threshold) : settings.alert_threshold,
        model: fallbackModel || settings.fallback_model,
      };
      await graphqlRequest({
        query: `mutation UpdateAIBudgetSettings($limit: numeric!, $threshold: numeric!, $model: String!) {
          update_ai_tenant_budgets(where: {}, _set: { monthly_limit_usd: $limit, alert_threshold: $threshold, fallback_model: $model }) {
            affected_rows
          }
        }`,
        variables,
      });
    },
    {
      onSuccess: () => {
        toast.success('Updated AI budget settings');
        setMonthlyLimit('');
        setThreshold('');
        setFallbackModel('');
        refetch();
      },
      onError: () => toast.error('Failed to update settings'),
    },
  );

  if (isLoading || !settings) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">AI Budget Settings</h1>
      <p className="text-gray-600 max-w-2xl">
        Configure your organisation’s overall AI budget and fallback policy. When
        your usage approaches the alert threshold, you will receive a cost
        notification. Once the budget is exceeded, the fallback model will be
        used for all AI calls.
      </p>
      <Card className="space-y-4 max-w-md">
        <div className="flex flex-col">
          <label htmlFor="limit">Monthly Limit (USD)</label>
          <Input
            id="limit"
            type="number"
            min="0"
            step="0.01"
            placeholder={settings.monthly_limit_usd.toString()}
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="threshold">Alert Threshold (%)</label>
          <Input
            id="threshold"
            type="number"
            min="0"
            max="100"
            placeholder={(settings.alert_threshold * 100).toFixed(0)}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="fallback">Fallback Model</label>
          <Select
            id="fallback"
            value={fallbackModel || settings.fallback_model}
            onChange={(e) => setFallbackModel(e.target.value)}
          >
            {/* Use a fixed set of models. These must match the names used in backend policies. */}
            <option value="gpt-4o">GPT‑4o</option>
            <option value="gpt-4o-mini">GPT‑4o Mini</option>
            <option value="gpt-3.5-turbo">GPT‑3.5 Turbo</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </Select>
        </div>
        <Button variant="primary" onClick={() => saveSettings.mutate()}>
          Save Settings
        </Button>
      </Card>
    </div>
  );
}

