import { useQuery } from '@tanstack/react-query';
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
        <Skeleton className="h-10 w-72" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

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
