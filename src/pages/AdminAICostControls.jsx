import React, { useEffect, useState } from 'react';
import { Page, Card, Button, TextInput, Select } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminAICostControls
 * Allows administrators to set per-tenant AI budgets and fallback policies.
 */
export default function AdminAICostControls() {
  const { hasPermission } = usePermissions();
  const [budget, setBudget] = useState<any>({
    monthly_limit_usd: 10,
    fallback_policy: 'block',
    alert_threshold: 0.8,
  });
  const [loading, setLoading] = useState(false);

  const loadBudget = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query GetBudget {
            ai_tenant_budgets(limit: 1) {
              monthly_limit_usd
              fallback_policy
              alert_threshold
            }
          }
        `,
        {}
      );
      if (res?.ai_tenant_budgets?.length) {
        setBudget(res.ai_tenant_budgets[0]);
      }
    } catch (err) {
      console.error('Failed to load budget', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_ai_budgets')) {
      loadBudget();
    }
  }, [hasPermission]);

  const saveBudget = async () => {
    setLoading(true);
    try {
      await nhost.graphql.request(
        `
          mutation UpsertBudget($object: ai_tenant_budgets_insert_input!) {
            insert_ai_tenant_budgets_one(
              object: $object,
              on_conflict: {
                constraint: ai_tenant_budgets_pkey,
                update_columns: [monthly_limit_usd, fallback_policy, alert_threshold]
              }
            ) {
              id
            }
          }
        `,
        { object: budget }
      );
    } catch (err) {
      console.error('Failed to save budget', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('manage_ai_budgets')) {
    return (
      <Page title="AI Cost Controls">
        <p>You do not have permission to manage AI cost controls.</p>
      </Page>
    );
  }

  return (
    <Page title="AI Cost Controls">
      <p>Set monthly AI budgets and configure fallback policies.</p>
      <Card className="p-4 space-y-4">
        <TextInput
          label="Monthly Budget (USD)"
          type="number"
          value={budget.monthly_limit_usd}
          onChange={(e: any) =>
            setBudget({ ...budget, monthly_limit_usd: parseFloat(e.target.value) || 0 })
          }
        />
        <Select
          label="Fallback Policy"
          value={budget.fallback_policy}
          onChange={(e: any) => setBudget({ ...budget, fallback_policy: e.target.value })}
          options={[
            { value: 'block', label: 'Block when exceeded' },
            { value: 'degrade', label: 'Degrade to cheaper model' },
            { value: 'always', label: 'Always allow (no blocking)' },
          ]}
        />
        <TextInput
          label="Alert Threshold (0-1)"
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={budget.alert_threshold}
          onChange={(e: any) =>
            setBudget({ ...budget, alert_threshold: parseFloat(e.target.value) || 0 })
          }
        />
        <Button onClick={saveBudget} disabled={loading}>
          Save Settings
        </Button>
      </Card>
    </Page>
  );
}
