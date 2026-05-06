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
          { label: 'Model states', value: '4', badge: 'Lifecycle', trend: 'flat', description: 'Draft, training, live, and archived models stay separate.' },
          { label: 'Dataset checks', value: 'Required', badge: 'Privacy', trend: 'up', description: 'PII and consent gates precede training.' },
          { label: 'Safety evals', value: '100%', badge: 'Guarded', trend: 'up', description: 'Fine-tuned models need policy and red-team results.' },
          { label: 'Rollback', value: '1 click', badge: 'Runbook', trend: 'flat', description: 'Live models can be removed through an audited runbook.' }
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <EnterprisePanel title="Fine-tuned models" description="Track model status, ownership, deployment scope, and usage metrics.">
            <EnterpriseWorkflowList
              items={[
                { label: 'District math coach v2', description: 'Awaiting safety evaluation before pilot rollout.', status: 'Training', tone: 'warning' },
                { label: 'Bilingual family brief tone', description: 'Approved for parent-facing summaries in two districts.', status: 'Live', tone: 'success' },
                { label: 'Archived curriculum draft', description: 'Retained for audit with no production access.', status: 'Archived', tone: 'neutral' }
              ]}
            />
          </EnterprisePanel>
          <EnterprisePanel title="Create new model" description="A guided wizard protects privacy, estimates cost, and captures approvals.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Upload dataset manifest', description: 'Require consent, data scope, retention, and owner metadata.', status: 'Step 1', tone: 'info' },
                { label: 'Run privacy scan', description: 'Block PII, unsupported student data, or missing purpose fields.', status: 'Step 2', tone: 'warning' },
                { label: 'Approve training plan', description: 'Capture model, epochs, cost, rollback, and evaluation criteria.', status: 'Step 3', tone: 'success' }
              ]}
            />
          </EnterprisePanel>
        </div>
        <EnterpriseComplianceStrip
          items={[
            { label: 'No raw student data by default', description: 'Datasets require documented minimization and consent.' },
            { label: 'Human approval gates', description: 'Training, deployment, and rollback are audited.' },
            { label: 'Tenant-scoped rollout', description: 'Models can be constrained to approved districts.' }
          ]}
        />
      </EnterpriseSurface>
    </ProtectedRoute>
  );
}
