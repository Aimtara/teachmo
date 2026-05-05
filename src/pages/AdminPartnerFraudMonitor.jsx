import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listPartnerFraudAlerts, resolvePartnerFraudAlert } from '@/domains/admin/partnerAdmin';
import { Card, Table, Button, LoadingSpinner } from '@/components/ui';
import { toast } from 'sonner';

/**
 * AdminPartnerFraudMonitor lists suspicious activities or fraud alerts related
 * to the partner marketplace. Administrators can see the reason for the alert
 * and mark it as resolved once reviewed. This helps prevent abuse and
 * fraudulent activity in the partner ecosystem.
 */
export default function AdminPartnerFraudMonitor() {
  // Query fraud alerts
  const {
    data: alerts = [],
    isLoading,
    refetch,
  } = useQuery(
    ['partnerFraudAlerts'],
    listPartnerFraudAlerts,
  );

  const resolveAlert = useMutation(
    resolvePartnerFraudAlert,
    {
      onSuccess: () => {
        toast.success('Marked alert as resolved');
        refetch();
      },
      onError: () => toast.error('Failed to update alert'),
    },
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Partner Fraud Monitor</h1>
      <p className="text-gray-600 max-w-2xl">
        View and manage fraud alerts raised against partner activity. Resolve
        alerts once they have been reviewed and addressed.
      </p>
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Partner ID</th>
              <th>Type</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No fraud alerts
                </td>
              </tr>
            )}
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{new Date(alert.created_at).toLocaleDateString()}</td>
                <td>{alert.partner_id}</td>
                <td>{alert.type}</td>
                <td>{alert.description}</td>
                <td>{alert.resolved ? 'Resolved' : 'Open'}</td>
                <td>
                  {!alert.resolved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => resolveAlert.mutate(alert.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

