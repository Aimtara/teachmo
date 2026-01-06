import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/config/api';
import { useTenant } from '@/contexts/TenantContext';
import { nhost } from '@/lib/nhostClient';

export default function AdminSystemHealth() {
  const tenant = useTenant();

  const headersQuery = useQuery({
    queryKey: ['system-health-headers', tenant.organizationId, tenant.schoolId],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (tenant.organizationId) headers['x-teachmo-org-id'] = tenant.organizationId;
      if (tenant.schoolId) headers['x-teachmo-school-id'] = tenant.schoolId;
      return headers;
    },
    enabled: !tenant.loading,
  });

  const healthQuery = useQuery({
    queryKey: ['system-health', headersQuery.data],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/system/health`, { headers: headersQuery.data });
      if (!response.ok) throw new Error('Failed to load system health');
      return response.json();
    },
  });

  const services = healthQuery.data?.services || [];
  const dependencies = healthQuery.data?.dependencies || [];

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">System health</h1>
        <p className="text-gray-600">Live service status and dependency checks.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">{service.name}</CardTitle>
              {service.status === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Status: <span className="font-medium text-gray-900">{service.status}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-500" />
              Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dependencies.map((dep) => (
              <div key={dep.name} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium">{dep.name}</div>
                  <div className="text-sm text-gray-500">
                    Pending: {dep.pending ?? 0} · Dead: {dep.dead ?? 0}
                  </div>
                </div>
                <span className={`text-sm font-medium ${dep.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {dep.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
