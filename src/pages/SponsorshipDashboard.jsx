import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/contexts/TenantContext';
import { apiClient } from '@/services/core/client';

export default function SponsorshipDashboard() {
  const { organizationId } = useTenant();

  const { data: sponsorships = [], isLoading } = useQuery({
    queryKey: ['sponsorships', organizationId],
    queryFn: async () => {
      const response = await apiClient.get('/api/partners/sponsorships', { org: organizationId });
      return response?.results || [];
    },
    enabled: Boolean(organizationId),
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SponsorshipPartner } from '@/api/entities';

export default function SponsorshipDashboard() {
  const { data: sponsorships = [], isLoading, isError } = useQuery({
    queryKey: ['sponsorship-partners'],
    queryFn: async () => {
      const response = await SponsorshipPartner.list();
      return (response || []).filter((partner) => partner?.is_active !== false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        <Skeleton className="h-10 w-72" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sponsorships & Grants</h1>
          <p className="text-slate-600">Manage corporate partners funding your district initiatives.</p>
        </div>
        <Button>Find Sponsors</Button>

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-sm text-red-700">
            We couldn&apos;t load sponsorship partners right now. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Active Sponsorship Partners</h1>
        <p className="text-slate-600">Track currently active partnerships and coverage details.</p>
      </div>

      {sponsorships.length === 0 ? (
        <Card className="border-2 border-dashed bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-4xl">🤝</div>
            <h3 className="text-lg font-medium text-slate-900">No active sponsorships</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Connect with local businesses and national partners to subsidize Teachmo for your families.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sponsorships.map((sponsor) => {
            const percent = sponsor.seats_total > 0
              ? Math.min(100, (sponsor.seats_allocated / sponsor.seats_total) * 100)
              : 0;

            return (
              <Card key={sponsor.id} className="overflow-hidden">
                <div className="h-2 bg-emerald-500" />
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>{sponsor.partner_name}</CardTitle>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {sponsor.type || 'Corporate Grant'}
                    </p>
                  </div>
                  <Badge variant={sponsor.status === 'active' ? 'default' : 'secondary'}>
                    {sponsor.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Coverage</span>
                    <span className="font-medium">
                      {sponsor.seats_allocated} / {sponsor.seats_total} families
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="border-t pt-2 text-xs text-slate-500">
                    Renewal: {sponsor.renewal_date ? new Date(sponsor.renewal_date).toLocaleDateString() : 'TBD'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Partner Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Partner</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Coverage</th>
                    <th className="px-3 py-2 font-medium">Seats</th>
                    <th className="px-3 py-2 font-medium">Renewal</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsorships.map((sponsor) => (
                    <tr key={sponsor.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium text-slate-900">{sponsor.partner_name ?? sponsor.name ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{sponsor.type ?? 'Corporate Grant'}</td>
                      <td className="px-3 py-3 text-slate-600">{sponsor.coverage_scope ?? sponsor.benefit_type ?? 'District'}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {sponsor.seats_allocated ?? 0} / {sponsor.seats_total ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {sponsor.renewal_date ? new Date(sponsor.renewal_date).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{sponsor.status ?? 'active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
