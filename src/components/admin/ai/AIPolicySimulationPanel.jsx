import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export default function AIPolicySimulationPanel({ headers, apiBaseUrl }) {
  const [form, setForm] = useState({
    role: 'parent',
    intent: 'chat',
    hasChildData: false,
    consentScope: '',
    guardianVerified: false,
    safetyEscalate: false,
    actorSchoolId: '',
    tenantSchoolId: '',
  });

  const simulation = useMutation({
    mutationFn: async () =>
      fetchJson(`${apiBaseUrl}/admin/ai/simulate-policy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          consentScope: form.consentScope.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      }),
  });
  const missingHeaders = !headers || typeof headers !== 'object';

  return (
    <Card>
      <CardHeader><CardTitle>Policy Simulation</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="role" />
        <Input value={form.intent} onChange={(e) => setForm((p) => ({ ...p, intent: e.target.value }))} placeholder="intent" />
        <Input value={form.consentScope} onChange={(e) => setForm((p) => ({ ...p, consentScope: e.target.value }))} placeholder="child_data,profile" />
        <Input value={form.actorSchoolId} onChange={(e) => setForm((p) => ({ ...p, actorSchoolId: e.target.value }))} placeholder="actor school id" />
        <Input value={form.tenantSchoolId} onChange={(e) => setForm((p) => ({ ...p, tenantSchoolId: e.target.value }))} placeholder="tenant school id" />
        <div className="flex gap-4">
          <label><input type="checkbox" checked={form.hasChildData} onChange={(e) => setForm((p) => ({ ...p, hasChildData: e.target.checked }))} /> Child data</label>
          <label><input type="checkbox" checked={form.guardianVerified} onChange={(e) => setForm((p) => ({ ...p, guardianVerified: e.target.checked }))} /> Guardian verified</label>
          <label><input type="checkbox" checked={form.safetyEscalate} onChange={(e) => setForm((p) => ({ ...p, safetyEscalate: e.target.checked }))} /> Safety escalate</label>
        </div>
        <Button onClick={() => simulation.mutate()} disabled={simulation.isPending || missingHeaders}>
          {simulation.isPending ? 'Simulating…' : 'Run simulation'}
        </Button>
        {missingHeaders ? (
          <div className="text-xs text-muted-foreground">
            Sign in to run policy simulations.
          </div>
        ) : null}
        {simulation.isError ? (
          <div className="text-xs text-red-600">
            {simulation.error instanceof Error ? simulation.error.message : 'Simulation failed'}
          </div>
        ) : null}
        {simulation.data?.decision ? (
          <pre className="rounded-md border p-3 text-xs overflow-auto">
            {JSON.stringify(simulation.data.decision, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

AIPolicySimulationPanel.propTypes = {
  headers: PropTypes.object,
  apiBaseUrl: PropTypes.string.isRequired,
};
