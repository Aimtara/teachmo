import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

function PartnerIncentivesContent() {
  const [list, setList] = useState([]);
  const [apps, setApps] = useState([]);
  const userId = useUserId();
  const { data: scope } = useTenantScope();
  const partnerId = userId;

  const tenantHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-user-id'] = userId;
    if (scope?.districtId) h['x-district-id'] = scope.districtId;
    if (scope?.schoolId) h['x-school-id'] = scope.schoolId;
    return h;
  }, [userId, scope?.districtId, scope?.schoolId]);

  const load = async () => {
    try {
      const [incentives, applications] = await Promise.all([
        fetch(`${API_BASE_URL}/incentives`, { headers: tenantHeaders }).then((r) => r.json()),
        partnerId
          ? fetch(`${API_BASE_URL}/incentives/applications/${partnerId}`, { headers: tenantHeaders }).then((r) => r.json())
          : Promise.resolve([]),
      ]);
      setList(incentives || []);
      setApps(applications || []);
    } catch (error) {
      console.error('Failed to load incentives:', error);
      ultraMinimalToast.error('Unable to load incentives.');
      setList([]);
      setApps([]);
    }
  };

  useEffect(() => { load(); }, [tenantHeaders, partnerId]);

  const apply = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/incentives/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tenantHeaders },
        body: JSON.stringify({ partnerId }),
      });
      load();
    } catch (error) {
      console.error('Failed to apply for incentive:', error);
      ultraMinimalToast.error('Unable to apply for this incentive.');
    }
  };

  const claim = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/incentives/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tenantHeaders },
        body: JSON.stringify({ partnerId }),
      });
      load();
    } catch (error) {
      console.error('Failed to claim incentive:', error);
      ultraMinimalToast.error('Unable to claim this incentive.');
    }
  };

  const appMap = Object.fromEntries(apps.map((a) => [a.incentive_id, a]));

  const getStatus = (application) => {
    if (!application) return { label: 'Not Applied', variant: 'secondary' };
    if (application.status === 'earned') return { label: 'Earned', variant: 'default' };
    if (application.status === 'approved') return { label: 'Approved', variant: 'default' };
    if (application.status === 'rejected') return { label: 'Rejected', variant: 'destructive' };
    return { label: application.status || 'Pending', variant: 'secondary' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Incentives</h1>
          <p className="text-gray-600">
            Track incentive programs, claim earned rewards, and monitor payout status.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Available programs</CardTitle>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incentive programs available yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((incentive) => {
                    const application = appMap[incentive.id];
                    const status = getStatus(application);
                    const value = incentive.value ? `$${incentive.value}` : '—';
                    const canClaim = application?.status === 'earned';
                    return (
                      <TableRow key={incentive.id}>
                        <TableCell className="font-medium">{incentive.title}</TableCell>
                        <TableCell className="text-muted-foreground">{incentive.description}</TableCell>
                        <TableCell>{value}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!application && (
                            <Button size="sm" onClick={() => apply(incentive.id)}>
                              Apply
                            </Button>
                          )}
                          {canClaim && (
                            <Button size="sm" onClick={() => claim(incentive.id)}>
                              Claim
                            </Button>
                          )}
                          {application && !canClaim && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PartnerIncentives() {
  return (
    <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']} requireAuth={true}>
      <PartnerIncentivesContent />
    </ProtectedRoute>
  );
}
