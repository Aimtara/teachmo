import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { graphql } from '@/lib/graphql';
import { useTenantScope } from '@/hooks/useTenantScope';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nhost } from '@/lib/nhostClient';
import {
  getAIBudget,
  getAIGovernanceBlockedReasons,
  getAIGovernanceOutcomes,
  getAIGovernanceSkillUsage,
  getAIGovernanceSummary,
  getAIGovernanceAuditExportUrl,
  getAIModelPolicy,
  getAIPromptsAdmin,
  getAIReviewQueue,
  getAIUsageSummary,
  updateAIBudget,
  updateAIModelPolicy,
} from '@/domains/ai/governanceAdmin';
import AIGovernanceOverviewCards from '@/components/admin/ai/AIGovernanceOverviewCards';
import AIGovernanceOutcomeList from '@/components/admin/ai/AIGovernanceOutcomeList';
import AIGovernanceBlockedReasons from '@/components/admin/ai/AIGovernanceBlockedReasons';
import AIGovernanceSkillUsage from '@/components/admin/ai/AIGovernanceSkillUsage';
import AIGovernanceFilters from '@/components/admin/ai/AIGovernanceFilters';
import AIPolicySimulationPanel from '@/components/admin/ai/AIPolicySimulationPanel';
import { EnterpriseSurface } from '@/components/enterprise';

function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

export default function AdminAIGovernance() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const schoolId = scope?.schoolId ?? null;

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
    queryFn: async () => getAIUsageSummary(headersQuery.data),
  });

  const reviewQueueQuery = useQuery({
    queryKey: ['ai-review-queue-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => getAIReviewQueue(headersQuery.data),
  });

  const promptLibraryQuery = useQuery({
    queryKey: ['ai-prompt-library-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => getAIPromptsAdmin(headersQuery.data),
  });

  const budgetQuery = useQuery({
    queryKey: ['ai-budget-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => getAIBudget(headersQuery.data),
  });

  const modelPolicyQuery = useQuery({
    queryKey: ['ai-model-policy-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => getAIModelPolicy(headersQuery.data),
  });

  const [windowDays, setWindowDays] = useState(30);

  const governanceSummaryQuery = useQuery({
    queryKey: ['ai-governance-summary', organizationId, schoolId, windowDays],
    enabled: Boolean(headersQuery.data && organizationId),
    queryFn: async () => getAIGovernanceSummary(windowDays, headersQuery.data),
  });

  const governanceOutcomesQuery = useQuery({
    queryKey: ['ai-governance-outcomes', organizationId, schoolId, windowDays],
    enabled: Boolean(headersQuery.data && organizationId),
    queryFn: async () => getAIGovernanceOutcomes(windowDays, headersQuery.data),
  });

  const blockedReasonsQuery = useQuery({
    queryKey: ['ai-governance-blocked-reasons', organizationId, schoolId, windowDays],
    enabled: Boolean(headersQuery.data && organizationId),
    queryFn: async () => getAIGovernanceBlockedReasons(windowDays, headersQuery.data),
  });

  const skillUsageQuery = useQuery({
    queryKey: ['ai-governance-skill-usage', organizationId, schoolId, windowDays],
    enabled: Boolean(headersQuery.data && organizationId),
    queryFn: async () => getAIGovernanceSkillUsage(windowDays, headersQuery.data),
  });

  const [budgetForm, setBudgetForm] = useState({ monthlyLimitUsd: '', fallbackPolicy: 'block' });
  const [modelForm, setModelForm] = useState({
    defaultModel: 'gpt-4o-mini',
    fallbackModel: 'gpt-4o-mini',
    allowedModels: 'gpt-4o-mini, gpt-4o',
    featureFlags: '',
  });

  useEffect(() => {
    if (budgetQuery.data?.budget) {
      setBudgetForm({
        monthlyLimitUsd: budgetQuery.data.budget.monthly_limit_usd ?? '',
        fallbackPolicy: budgetQuery.data.budget.fallback_policy ?? 'block',
      });
    }
  }, [budgetQuery.data]);

  useEffect(() => {
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
      return updateAIBudget(
        {
          monthlyLimitUsd: budgetForm.monthlyLimitUsd ? Number(budgetForm.monthlyLimitUsd) : null,
          fallbackPolicy: budgetForm.fallbackPolicy,
        },
        headersQuery.data,
      );
    },
    onSuccess: () => budgetQuery.refetch(),
  });

  const modelPolicyMutation = useMutation({
    mutationFn: async () => {
      return updateAIModelPolicy(
        {
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
        },
        headersQuery.data,
      );
    },
    onSuccess: () => modelPolicyQuery.refetch(),
  });

  const pendingCount = reviewQueueQuery.data?.queue?.length ?? 0;
  const promptCount = promptLibraryQuery.data?.prompts?.length ?? 0;
  const usageTotals = usageSummaryQuery.data?.totals;

  const governanceSummary = governanceSummaryQuery.data;
  const governanceOutcomes =
    !governanceOutcomesQuery.isLoading && !governanceOutcomesQuery.isError
      ? governanceOutcomesQuery.data?.outcomes ?? []
      : undefined;
  const blockedReasons =
    !blockedReasonsQuery.isLoading && !blockedReasonsQuery.isError
      ? blockedReasonsQuery.data?.reasons ?? []
      : undefined;
  const skillUsage =
    !skillUsageQuery.isLoading && !skillUsageQuery.isError
      ? skillUsageQuery.data?.skills ?? []
      : undefined;

  return (
    <ProtectedRoute allowedRoles={['system_admin', 'district_admin', 'school_admin', 'admin']}>
      <EnterpriseSurface
        eyebrow="AI governance and trust"
        title="Trust console"
        description="Incident review, policy simulation, audit exports, prompt governance, usage controls, and public transparency all operate from one command-center surface."
        badges={['Incident runbooks', 'Policy simulation', 'Audit logs', 'Privacy controls']}
        metrics={[
          { label: 'Pending reviews', value: String(pendingCount), badge: 'Queue', trend: 'flat' },
          { label: 'Logged requests', value: String(usageTotals?.calls ?? 0), badge: 'Traceable', trend: 'up' },
          { label: 'Active prompts', value: String(promptCount), badge: 'Versioned', trend: 'flat' },
          { label: 'Simulation', value: 'Live', badge: 'Guardrail', trend: 'up' }
        ]}
      >

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <AIGovernanceFilters value={windowDays} onChange={setWindowDays} />
          <div className="text-xs text-muted-foreground">
            Governance dashboard window: last {windowDays} days
          </div>
        </div>

        <AIGovernanceOverviewCards summary={governanceSummary} />

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
                <span className="font-semibold">${formatMoney(usageTotals?.cost_usd)}</span>
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

        <div className="grid gap-4 xl:grid-cols-3">
          <AIGovernanceOutcomeList outcomes={governanceOutcomes} />
          <AIGovernanceBlockedReasons reasons={blockedReasons} />
          <AIGovernanceSkillUsage skills={skillUsage} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              Export AI governance activity, policy outcomes, and verifier signals for audits.
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <a href={getAIGovernanceAuditExportUrl(windowDays)} target="_blank" rel="noreferrer">Export JSON</a>
              </Button>
              <Button variant="outline" asChild>
                <a href={getAIGovernanceAuditExportUrl(windowDays, 'csv')} target="_blank" rel="noreferrer">Export CSV</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <AIPolicySimulationPanel headers={headersQuery.data} />

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
                Current spend: ${formatMoney(budgetQuery.data?.budget?.spent_usd)} · Reset at{' '}
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
      </EnterpriseSurface>
    </ProtectedRoute>
  );
}
