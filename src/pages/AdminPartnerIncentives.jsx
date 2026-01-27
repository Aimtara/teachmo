import React, { useEffect, useState } from 'react';
import { Page, Card, Button, TextInput, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminPartnerIncentives
 * Allows administrators to configure partner incentives, referral codes and payouts.
 */
export default function AdminPartnerIncentives() {
  const { hasPermission } = usePermissions();
  const [incentives, setIncentives] = useState<any[]>([]);
  const [newIncentive, setNewIncentive] = useState({
    name: '',
    type: 'fixed',
    value: 0,
    active: true,
  });
  const [loading, setLoading] = useState(false);

  const loadIncentives = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query ListIncentives {
            partner_incentives {
              id
              name
              type
              value
              active
            }
          }
        `,
        {}
      );
      setIncentives(res?.partner_incentives || []);
    } catch (err) {
      console.error('Failed to load incentives', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_partner_incentives')) {
      loadIncentives();
    }
  }, [hasPermission]);

  const saveIncentive = async () => {
    setLoading(true);
    try {
      await nhost.graphql.request(
        `
          mutation UpsertIncentive($object: partner_incentives_insert_input!) {
            insert_partner_incentives_one(
              object: $object,
              on_conflict: { constraint: partner_incentives_pkey, update_columns: [name, type, value, active] }
            ) { id }
          }
        `,
        { object: newIncentive }
      );
      setNewIncentive({ name: '', type: 'fixed', value: 0, active: true });
      loadIncentives();
    } catch (err) {
      console.error('Failed to save incentive', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await nhost.graphql.request(
        `
          mutation ToggleIncentive($id: uuid!, $active: Boolean!) {
            update_partner_incentives_by_pk(pk_columns: { id: $id }, _set: { active: $active }) { id }
          }
        `,
        { id, active }
      );
      loadIncentives();
    } catch (err) {
      console.error('Failed to toggle incentive', err);
    }
  };

  if (!hasPermission('manage_partner_incentives')) {
    return (
      <Page title="Partner Incentives">
        <p>You do not have permission to manage partner incentives.</p>
      </Page>
    );
  }

  return (
    <Page title="Partner Incentives">
      <p>Configure incentives and referral codes for partner payouts.</p>
      <Card className="p-4 space-y-3 mb-4">
        <h3 className="text-lg font-semibold">Create / Edit Incentive</h3>
        <TextInput
          label="Name"
          value={newIncentive.name}
          onChange={(e: any) => setNewIncentive({ ...newIncentive, name: e.target.value })}
        />
        <TextInput
          label="Type (fixed or percentage)"
          value={newIncentive.type}
          onChange={(e: any) => setNewIncentive({ ...newIncentive, type: e.target.value })}
        />
        <TextInput
          label="Value"
          type="number"
          value={newIncentive.value}
          onChange={(e: any) => setNewIncentive({ ...newIncentive, value: parseFloat(e.target.value) || 0 })}
        />
        <Button onClick={saveIncentive} disabled={loading}>Save Incentive</Button>
      </Card>
      <h3 className="text-lg font-semibold mb-2">Existing Incentives</h3>
      <Table
        data={incentives}
        columns={[
          { Header: 'Name', accessor: 'name' },
          { Header: 'Type', accessor: 'type' },
          { Header: 'Value', accessor: 'value' },
          { Header: 'Active', accessor: 'active' },
          {
            Header: 'Actions',
            accessor: 'actions',
            Cell: ({ row }: any) => (
              <Button
                onClick={() => toggleActive(row.original.id, !row.original.active)}
              >
                {row.original.active ? 'Deactivate' : 'Activate'}
              </Button>
            ),
          },
        ]}
      />
    </Page>
  );
}
