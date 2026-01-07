import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export default function AdminAIGovernance() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;

  const headersQuery = useQuery({
    queryKey: ['ai-governance-token'],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });

  const policyQuery = useQuery({
    queryKey: ['ai-policy-docs-admin', organizationId],
    queryFn: async () => {
      const query = `query AIPolicyDocsAdmin($where: ai_policy_docs_bool_exp) {
        ai_policy_docs(where: $where, order_by: { published_at: desc }) {
          id
          title
          summary
          published_at
        }
      }`;
      const where = organizationId
        ? { _or: [{ organization_id: { _eq: organizationId } }, { organization_id: { _is_null: true } }] }
        : { organization_id: { _is_null: true } };
      const res = await graphql(query, { where });
      return res?.ai_policy_docs ?? [];
    },
  });

  const usageSummaryQuery = useQuery({
    queryKey: ['ai-usage-summary'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/usage-summary`, { headers: headersQuery.data }),
  });

  const reviewQueueQuery = useQuery({
    queryKey: ['ai-review-queue-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/review-queue`, { headers: headersQuery.data }),
  });

  const promptLibraryQuery = useQuery({
    queryKey: ['ai-prompt-library-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/prompts`, { headers: headersQuery.data }),
  });

  const budgetQuery = useQuery({
    queryKey: ['ai-budget-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/budget`, { headers: headersQuery.data }),
  });

  const modelPolicyQuery = useQuery({
    queryKey: ['ai-model-policy-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/model-policy`, { headers: headersQuery.data }),
  });

  const [budgetForm, setBudgetForm] = useState({ monthlyLimitUsd: '', fallbackPolicy: 'block' });
  const [modelForm, setModelForm] = useState({
    defaultModel: 'gpt-4o-mini',
    fallbackModel: 'gpt-4o-mini',
    allowedModels: 'gpt-4o-mini, gpt-4o',
    featureFlags: '',
  });

  useMemo(() => {
    if (budgetQuery.data?.budget) {
      setBudgetForm({
        monthlyLimitUsd: budgetQuery.data.budget.monthly_limit_usd ?? '',
        fallbackPolicy: budgetQuery.data.budget.fallback_policy ?? 'block',
      });
    }
  }, [budgetQuery.data]);

  useMemo(() => {
    if (modelPolicyQuery.data?.policy) {
      const policy = modelPolicyQuery.data.policy;
      setModelForm({
        defaultModel: policy.default_model ?? 'gpt-4o-mini',
        fallbackModel: policy.fallback_model ?? 'gpt-4o-mini',
        allowedModels: (policy.allowed_models || []).join(', '),
        featureFlags: (policy.feature_flags || []).join(', '),
      });
    }
  }, [modelPolicyQuery.data]);

  const budgetMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/ai/budget`, {
        method: 'PUT',
        headers: headersQuery.data,
        body: JSON.stringify({
          monthlyLimitUsd: budgetForm.monthlyLimitUsd ? Number(budgetForm.monthlyLimitUsd) : null,
          fallbackPolicy: budgetForm.fallbackPolicy,
        }),
      });
    },
    onSuccess: () => budgetQuery.refetch(),
  });

  const modelPolicyMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/ai/model-policy`, {
        method: 'PUT',
        headers: headersQuery.data,
        body: JSON.stringify({
          defaultModel: modelForm.defaultModel,
          fallbackModel: modelForm.fallbackModel,
          allowedModels: modelForm.allowedModels
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          featureFlags: modelForm.featureFlags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
    },
    onSuccess: () => modelPolicyQuery.refetch(),
  });

  const pendingCount = reviewQueueQuery.data?.queue?.length ?? 0;
  const promptCount = promptLibraryQuery.data?.prompts?.length ?? 0;
  const usageTotals = usageSummaryQuery.data?.totals;

  return (
    <ProtectedRoute allowedRoles={['system_admin', 'district_admin', 'school_admin', 'admin']}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">AI Governance &amp; Transparency</h1>
          <p className="text-sm text-muted-foreground">
            Track AI model usage, review queue activity, and published transparency briefs for your tenant.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pending reviews</span>
                <span className="font-semibold">{pendingCount}</span>
              </div>
              <Link className="text-blue-600 hover:underline" to="/admin/ai-review-queue">
                Open AI review queue →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Usage Logging</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total AI requests logged</span>
                <span className="font-semibold">{usageTotals?.calls ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated spend</span>
                <span className="font-semibold">${usageTotals?.cost_usd?.toFixed?.(2) ?? '0.00'}</span>
              </div>
              <Link className="text-blue-600 hover:underline" to="/admin/analytics">
                Explore analytics →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Prompt Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Active prompts</span>
                <span className="font-semibold">{promptCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Manage versions, approvals, and rollout metadata for AI prompt templates.
              </div>
              <Link className="text-blue-600 hover:underline" to="/admin/ai-prompts">
                Open prompt library →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>AI Budget &amp; Fallbacks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Monthly budget (USD)</div>
                <Input
                  value={budgetForm.monthlyLimitUsd}
                  onChange={(e) => setBudgetForm((prev) => ({ ...prev, monthlyLimitUsd: e.target.value }))}
                  placeholder="250"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fallback policy</div>
                <Select
                  value={budgetForm.fallbackPolicy}
                  onValueChange={(value) => setBudgetForm((prev) => ({ ...prev, fallbackPolicy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fallback" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block requests</SelectItem>
                    <SelectItem value="degrade">Degrade model</SelectItem>
                    <SelectItem value="allow">Allow overage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => budgetMutation.mutate()} disabled={budgetMutation.isPending}>
                {budgetMutation.isPending ? 'Saving…' : 'Save budget settings'}
              </Button>
              <div className="text-xs text-muted-foreground">
                Current spend: ${budgetQuery.data?.budget?.spent_usd ?? 0} · Reset at{' '}
                {budgetQuery.data?.budget?.reset_at
                  ? new Date(budgetQuery.data.budget.reset_at).toLocaleDateString()
                  : '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Default model</div>
                <Input
                  value={modelForm.defaultModel}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, defaultModel: e.target.value }))}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fallback model</div>
                <Input
                  value={modelForm.fallbackModel}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, fallbackModel: e.target.value }))}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Allowed models (comma-separated)</div>
                <Input
                  value={modelForm.allowedModels}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, allowedModels: e.target.value }))}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Required feature flags</div>
                <Input
                  value={modelForm.featureFlags}
                  onChange={(e) => setModelForm((prev) => ({ ...prev, featureFlags: e.target.value }))}
                  placeholder="ENTERPRISE_AI_GOVERNANCE"
                />
              </div>
              <Button onClick={() => modelPolicyMutation.mutate()} disabled={modelPolicyMutation.isPending}>
                {modelPolicyMutation.isPending ? 'Saving…' : 'Save model policy'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transparency Docs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(policyQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">No published docs yet. Seeded documents will appear after migration.</p>
            ) : (
              <ul className="space-y-2">
                {policyQuery.data.map((doc) => (
                  <li key={doc.id} className="border rounded-lg p-3">
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">{doc.summary}</div>
                  </li>
                ))}
              </ul>
            )}
            <Link className="text-blue-600 hover:underline" to="/ai/transparency">
              View public transparency page →
            </Link>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
