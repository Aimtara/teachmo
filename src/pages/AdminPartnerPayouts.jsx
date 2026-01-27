import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Button, LoadingSpinner } from '@/components/ui';
import { toast } from 'sonner';

/**
 * AdminPartnerPayouts allows administrators to connect a payout provider (e.g.
 * Stripe) for partners and view payout history. Partners can request
 * withdrawal of their earnings; admins can trigger payouts or disconnect the
 * integration. This page is a placeholder and uses stubbed functions for
 * demonstration.
 */
export default function AdminPartnerPayouts() {
  // Query current payout status and history
  const {
    data: payoutInfo = { connected: false, history: [] },
    isLoading,
    refetch,
  } = useQuery(
    ['partnerPayoutInfo'],
    async () => {
      const res = await graphqlRequest({
        query: `query PartnerPayoutInfo {
          partner_payout_info {
            connected
            account_email
          }
          partner_payouts(order_by: {created_at: desc}) {
            id
            amount
            currency
            status
            created_at
          }
        }`,
      });
      return {
        connected: res?.partner_payout_info?.connected ?? false,
        account_email: res?.partner_payout_info?.account_email ?? null,
        history: res?.partner_payouts ?? [],
      };
    },
  );

  // Mutation to connect payout provider (e.g. Stripe)
  const connect = useMutation(
    async () => {
      await graphqlRequest({
        query: `mutation ConnectPayoutProvider {
          partner_connect_payout
        }`,
      });
    },
    {
      onSuccess: () => {
        toast.success('Payout provider connected');
        refetch();
      },
      onError: () => toast.error('Failed to connect provider'),
    },
  );

  // Mutation to disconnect payout provider
  const disconnect = useMutation(
    async () => {
      await graphqlRequest({
        query: `mutation DisconnectPayoutProvider {
          partner_disconnect_payout
        }`,
      });
    },
    {
      onSuccess: () => {
        toast.success('Disconnected');
        refetch();
      },
      onError: () => toast.error('Failed to disconnect'),
    },
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Partner Payouts</h1>
      <p className="text-gray-600 max-w-2xl">
        Manage payout integration and view payout history. Partners receive
        earnings via the configured payout provider; you can connect or
        disconnect the integration and view recent payouts.
      </p>
      <Card className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">Payout Provider Status:</p>
            <p>
              {payoutInfo.connected
                ? `Connected (${payoutInfo.account_email})`
                : 'Not connected'}
            </p>
          </div>
          {payoutInfo.connected ? (
            <Button variant="secondary" onClick={() => disconnect.mutate()}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" onClick={() => connect.mutate()}>
              Connect
            </Button>
          )}
        </div>
        <h2 className="text-lg font-semibold mt-4">Payout History</h2>
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payoutInfo.history.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center py-4">
                  No payouts found
                </td>
              </tr>
            )}
            {payoutInfo.history.map((payout) => (
              <tr key={payout.id}>
                <td>{new Date(payout.created_at).toLocaleDateString()}</td>
                <td>
                  {payout.amount.toFixed(2)} {payout.currency.toUpperCase()}
                </td>
                <td className="capitalize">{payout.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

