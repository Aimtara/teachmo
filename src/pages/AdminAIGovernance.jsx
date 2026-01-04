import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { graphql } from '@/lib/graphql';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAIGovernance() {
  const policyQuery = useQuery({
    queryKey: ['ai-policy-docs-admin'],
    queryFn: async () => {
      const query = `query AIPolicyDocsAdmin {\n        ai_policy_docs(order_by: { published_at: desc }) {\n          id\n          title\n          summary\n          published_at\n        }\n      }`;
      const res = await graphql(query);
      return res?.ai_policy_docs ?? [];
    },
  });

  const reviewCountQuery = useQuery({
    queryKey: ['ai-review-counts'],
    queryFn: async () => {
      const query = `query ReviewCounts {\n        ai_review_queue_aggregate(where: { status: { _eq: \"pending\" } }) { aggregate { count } }\n        ai_usage_logs_aggregate { aggregate { count } }\n      }`;
      const res = await graphql(query);
      return {
        pending: res?.ai_review_queue_aggregate?.aggregate?.count ?? 0,
        usage: res?.ai_usage_logs_aggregate?.aggregate?.count ?? 0,
      };
    },
  });

  return (
    <ProtectedRoute allowedRoles={['system_admin', 'district_admin', 'school_admin', 'admin']}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">AI Governance &amp; Transparency</h1>
          <p className="text-sm text-muted-foreground">
            Track AI model usage, review queue activity, and published transparency briefs for your tenant.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pending reviews</span>
                <span className="font-semibold">{reviewCountQuery.data?.pending ?? 0}</span>
              </div>
              <Link className="text-blue-600 hover:underline" to="/admin/ai-review">
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
                <span className="font-semibold">{reviewCountQuery.data?.usage ?? 0}</span>
              </div>
              <Link className="text-blue-600 hover:underline" to="/admin/audit-logs">
                Export audit logs →
              </Link>
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
