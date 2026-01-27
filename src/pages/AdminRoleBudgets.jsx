import React, { useEffect, useState } from 'react';
import { Page, Button, TextInput, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminRoleBudgets
 * Allows administrators to set AI cost allowances per user role.
 */
export default function AdminRoleBudgets() {
  const { hasPermission } = usePermissions();
  const [roleBudgets, setRoleBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBudgets = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query GetRoleBudgets {
            ai_role_budgets {
              role
              monthly_limit_usd
            }
          }
        `,
        {}
      );
      setRoleBudgets(res?.ai_role_budgets || []);
    } catch (err) {
      console.error('Failed to load role budgets', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_ai_budgets')) {
      loadBudgets();
    }
  }, [hasPermission]);

  const updateBudget = async (role: string, value: number) => {
    setLoading(true);
    try {
      await nhost.graphql.request(
        `
          mutation UpsertRoleBudget($object: ai_role_budgets_insert_input!) {
            insert_ai_role_budgets_one(
              object: $object,
              on_conflict: { constraint: ai_role_budgets_pkey, update_columns: [monthly_limit_usd] }
            ) { role }
          }
        `,
        { object: { role, monthly_limit_usd: value } }
      );
      loadBudgets();
    } catch (err) {
      console.error('Failed to update role budget', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { Header: 'Role', accessor: 'role' },
    {
      Header: 'Monthly Limit (USD)',
      accessor: 'monthly_limit_usd',
      Cell: ({ row }: any) => {
        const [value, setValue] = useState(row.original.monthly_limit_usd);
        return (
          <div className="flex space-x-2 items-center">
            <TextInput
              type="number"
              value={value}
              onChange={(e: any) => setValue(parseFloat(e.target.value) || 0)}
            />
            <Button onClick={() => updateBudget(row.original.role, value)} disabled={loading}>
              Save
            </Button>
          </div>
        );
      },
    },
  ];

  if (!hasPermission('manage_ai_budgets')) {
    return (
      <Page title="Role Budgets">
        <p>You do not have permission to manage AI cost controls.</p>
      </Page>
    );
  }

  return (
    <Page title="Role Budgets">
      <p>Set monthly AI cost limits for each user role.</p>
      <Table data={roleBudgets} columns={columns} />
    </Page>
  );
}
