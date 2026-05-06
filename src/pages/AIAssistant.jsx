import { useUserData } from '@nhost/react';
import EnhancedAIAssistant from '@/components/ai/EnhancedAIAssistant';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

export default function AIAssistant() {
  const user = useUserData();
  return (
    <EnterpriseSurface
      eyebrow="AI hub"
      title="Ask, act, and understand"
      description="The AI assistant, quick actions, voice entry, explainability, and privacy posture now live together in one calm command surface."
      badges={['Answers target <3s', 'Explainability panel', 'Personalization opt-out']}
      metrics={[
        { label: 'Response budget', value: '<3s', badge: 'Live', trend: 'up' },
        { label: 'Quick actions', value: '6', badge: 'Role-aware', trend: 'flat' },
        { label: 'Privacy controls', value: 'Visible', badge: 'Opt-out', trend: 'up' },
        { label: 'Explainability', value: 'On', badge: 'Audited', trend: 'flat' }
      ]}
      aside={
        <>
          <EnterprisePanel title="Quick actions" description="Common AI workflows are one click away.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Draft teacher message', status: 'Human review', tone: 'info' },
                { label: 'Summarize weekly brief', status: 'Parent-ready', tone: 'success' },
                { label: 'Explain recommendation', status: 'Transparent', tone: 'success' }
              ]}
            />
          </EnterprisePanel>
          <EnterpriseComplianceStrip
            items={[
              { label: 'Data minimization' },
              { label: 'Voice-ready' },
              { label: 'Audit trail' }
            ]}
          />
        </>
      }
    >
      <EnterprisePanel title="AI chat workspace" description="Existing assistant capabilities remain available inside the redesigned hub.">
        <div className="overflow-hidden rounded-3xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)]">
          <EnhancedAIAssistant user={user} />
        </div>
      </EnterprisePanel>
    </EnterpriseSurface>
  );
}
