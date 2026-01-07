import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Input, Button, LoadingSpinner } from '@/components/ui';
import { toast } from 'react-toastify';

/**
 * AdminPartnerReferrals manages referral codes for partners. District
 * administrators can create referral codes with a discount value and
 * expiration date, see their usage and deactivate or reactivate codes.
 */
export default function AdminPartnerReferrals() {
  const [newCode, setNewCode] = useState('');
  const [value, setValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Query existing referral codes
  const {
    data: codes = [],
    isLoading,
    refetch,
  } = useQuery(
    ['partnerReferralCodes'],
    async () => {
      const res = await graphqlRequest({
        query: `query PartnerReferralCodes {
          partner_referral_codes(order_by: {created_at: desc}) {
            id
            code
            value
            expires_at
            used_count
            active
          }
        }`,
      });
      return res?.partner_referral_codes ?? [];
    },
  );

  // Mutation to create a new referral code
  const createCode = useMutation(
    async () => {
      if (!newCode || !value) throw new Error('Missing fields');
      await graphqlRequest({
        query: `mutation CreateReferralCode($code: String!, $value: numeric!, $expiresAt: timestamptz) {
          insert_partner_referral_codes_one(object: { code: $code, value: $value, expires_at: $expiresAt }) {
            id
          }
        }`,
        variables: { code: newCode, value: parseFloat(value), expiresAt: expiresAt || null },
      });
    },
    {
      onSuccess: () => {
        toast.success('Created referral code');
        setNewCode('');
        setValue('');
        setExpiresAt('');
        refetch();
      },
      onError: (err) => toast.error(err.message || 'Failed to create code'),
    },
  );

  // Mutation to toggle active state
  const toggleActive = useMutation(
    async ({ id, active }) => {
      await graphqlRequest({
        query: `mutation ToggleReferralCode($id: uuid!, $active: Boolean!) {
          update_partner_referral_codes_by_pk(pk_columns: {id: $id}, _set: {active: $active}) {
            id
          }
        }`,
        variables: { id, active },
      });
    },
    {
      onSuccess: () => {
        toast.success('Updated code');
        refetch();
      },
      onError: () => toast.error('Failed to update code'),
    },
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Partner Referral Codes</h1>
      <p className="text-gray-600 max-w-2xl">
        Create referral codes to incentivise districts or partners. Referral codes
        can provide a fixed discount and optional expiry. Codes can be
        deactivated at any time.
      </p>
      <Card className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex flex-col">
            <label htmlFor="code">Code</label>
            <Input id="code" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="SUMMER25" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="value">Discount Value (%)</label>
            <Input id="value" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="10" min="1" max="100" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="expires">Expires At</label>
            <Input id="expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <Button variant="primary" onClick={() => createCode.mutate()}>
            Create
          </Button>
        </div>
        <Table className="mt-4">
          <thead>
            <tr>
              <th>Code</th>
              <th>Value (%)</th>
              <th>Expires</th>
              <th>Uses</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{c.value}</td>
                <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                <td>{c.used_count}</td>
                <td>{c.active ? 'Active' : 'Inactive'}</td>
                <td>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleActive.mutate({ id: c.id, active: !c.active })}
                  >
                    {c.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

