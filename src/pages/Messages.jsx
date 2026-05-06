import {
  EnterpriseFilterBar,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

export default function Messages() {
  return (
    <EnterpriseSurface
      eyebrow="Messaging"
      title="Rich family and classroom chat"
      description="Conversations now present request approvals, attachments, voice notes, real-time status, and guardian-safe controls in one responsive inbox."
      badges={['Real-time status', 'Attachments', 'Voice messages', 'Moderation hooks']}
      metrics={[
        { label: 'Approval queue', value: '4', badge: 'Fast path', trend: 'down', description: 'Message requests can be approved without leaving the inbox.' },
        { label: 'Unread priority', value: '12', badge: 'Smart queue', trend: 'flat', description: 'Teacher and family replies rank by urgency and role.' },
        { label: 'Median reply', value: '18m', badge: 'Targeted', trend: 'up', description: 'Response metrics support workload triage.' },
        { label: 'Safety checks', value: '<1m', badge: 'Moderated', trend: 'up', description: 'Reports can propagate to moderation queues quickly.' }
      ]}
    >
      <EnterpriseFilterBar
        searchLabel="Search conversations, families, or attachments"
        filters={['Needs reply', 'Approvals', 'Voice notes', 'Attachments', 'Translated']}
      />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <EnterprisePanel title="Conversation list" description="Virtualized list pattern with clear status and role context.">
          <EnterpriseWorkflowList
            items={[
              { label: 'Avery Chen family', description: 'Voice message received about tomorrow pickup.', status: 'Needs reply', tone: 'warning' },
              { label: 'Office hours requests', description: 'Three guardians requested time slots this week.', status: 'Approve', tone: 'info' },
              { label: 'Science class digest', description: 'Draft weekly update ready for review.', status: 'AI draft', tone: 'success' },
              { label: 'Safety report thread', description: 'Escalated to moderation with audit context.', status: 'Guarded', tone: 'danger' }
            ]}
          />
        </EnterprisePanel>
        <EnterprisePanel title="Conversation workspace" description="Composer supports rich text, attachments, quick approvals, and accessible voice controls.">
          <div className="space-y-4">
            {[
              ['Teacher', 'Thanks for flagging. I can move the conference to Thursday at 4:30.'],
              ['Guardian', 'That works. Could you also send the weekly math practice link?'],
              ['AI assist', 'Suggested reply includes the link, a short encouragement, and a privacy-safe summary.']
            ].map(([author, body]) => (
              <div key={author} className="rounded-2xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_4%,transparent)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-muted)]">{author}</p>
                <p className="mt-2 text-sm leading-6">{body}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-[var(--enterprise-border)] p-4 text-sm text-[var(--enterprise-muted)]">
              Composer controls: attach file, record voice note, translate, request approval, explain AI suggestion.
            </div>
          </div>
        </EnterprisePanel>
      </div>
    </EnterpriseSurface>
  );
}
