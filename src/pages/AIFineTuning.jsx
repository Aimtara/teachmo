import ProtectedRoute from '@/components/shared/ProtectedRoute';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

// AIFineTuning page
//
// This page allows system administrators to manage fine-tuned AI models for
// specific enterprise needs. It provides an interface to view existing
// custom models, track their training status, and initiate new fine-tuning
// jobs. The actual training pipeline will run on the backend and is
// configured separately.

export default function AIFineTuning() {
  return (
    <ProtectedRoute allowedRoles={['system_admin']}>
      <EnterpriseSurface
        eyebrow="AI training"
        title="Fine-tuning studio"
        description="System administrators can manage custom model candidates, dataset readiness, safety gates, training status, and decommission workflows."
        badges={['RBAC only', 'Dataset checks', 'Safety gates', 'Audit logging']}
        metrics={[
          { label: 'Model states', value: '4', badge: 'Lifecycle', trend: 'flat' },
          { label: 'Dataset checks', value: 'Required', badge: 'Privacy', trend: 'up' },
          { label: 'Safety evals', value: '100%', badge: 'Guarded', trend: 'up' },
          { label: 'Rollback', value: '1 click', badge: 'Runbook', trend: 'flat' }
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <EnterprisePanel title="Fine-tuned models" description="Track model status, ownership, deployment scope, and usage metrics.">
            <EnterpriseWorkflowList
              items={[
                { label: 'District math coach v2', status: 'Training', tone: 'warning' },
                { label: 'Bilingual family brief tone', status: 'Live', tone: 'success' },
                { label: 'Archived curriculum draft', status: 'Archived', tone: 'neutral' }
              ]}
            />
          </EnterprisePanel>
          <EnterprisePanel title="Create new model" description="A guided wizard protects privacy, estimates cost, and captures approvals.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Upload dataset manifest', status: 'Step 1', tone: 'info' },
                { label: 'Run privacy scan', status: 'Step 2', tone: 'warning' },
                { label: 'Approve training plan', status: 'Step 3', tone: 'success' }
              ]}
            />
          </EnterprisePanel>
        </div>
        <EnterpriseComplianceStrip
          items={[
            { label: 'No raw student data by default' },
            { label: 'Human approval gates' },
            { label: 'Tenant-scoped rollout' }
          ]}
        />
      </EnterpriseSurface>
    </ProtectedRoute>
  );
}
