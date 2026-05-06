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
        { label: 'Response budget', value: '<3s', badge: 'Live', trend: 'up', description: 'Hub copy reinforces the latency target for chat answers.' },
        { label: 'Quick actions', value: '6', badge: 'Role-aware', trend: 'flat', description: 'Summarize, draft, translate, schedule, explain, and export.' },
        { label: 'Privacy controls', value: 'Visible', badge: 'Opt-out', trend: 'up', description: 'Personalization controls stay adjacent to AI usage.' },
        { label: 'Explainability', value: 'On', badge: 'Audited', trend: 'flat', description: 'Users can inspect sources, policy checks, and confidence.' }
      ]}
      aside={
        <>
          <EnterprisePanel title="Quick actions" description="Common AI workflows are one click away.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Draft teacher message', description: 'Keeps tone supportive and FERPA-safe.', status: 'Human review', tone: 'info' },
                { label: 'Summarize weekly brief', description: 'Highlights three practical next steps.', status: 'Parent-ready', tone: 'success' },
                { label: 'Explain recommendation', description: 'Shows signals without exposing sensitive data.', status: 'Transparent', tone: 'success' }
              ]}
            />
          </EnterprisePanel>
          <EnterpriseComplianceStrip
            items={[
              { label: 'Data minimization', description: 'Only needed context is sent to AI workflows.' },
              { label: 'Voice-ready', description: 'Voice input and transcripts follow existing controls.' },
              { label: 'Audit trail', description: 'Sensitive assistant actions are explainable and reviewable.' }
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
