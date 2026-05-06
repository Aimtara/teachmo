import ProtectedRoute from "@/components/shared/ProtectedRoute";
import {
  EnterpriseFilterBar,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

export default function UnifiedCommunity() {
  return (
    <ProtectedRoute allowedRoles={["parent", "teacher"]} requireAuth={true}>
      <EnterpriseSurface
        eyebrow="Community"
        title="Pods, leaderboards, and trusted discussions"
        description="The community hub now describes the target social surface: personalized pods, searchable posts, privacy labels, leaderboards, and fast moderation escalation."
        badges={['Search + filters', 'Privacy labels', 'Leaderboards', 'Moderation <1m']}
        metrics={[
          { label: 'Active pods', value: '18', badge: 'Personalized', trend: 'up', description: 'Groups align by class, school, interests, and opt-in privacy.' },
          { label: 'Moderation SLA', value: '<1m', badge: 'Queued', trend: 'up', description: 'Reports propagate into admin moderation workflows.' },
          { label: 'Leaderboard clarity', value: '100%', badge: 'Explained', trend: 'flat', description: 'Scoring rules and badges are transparent.' },
          { label: 'Post types', value: '5', badge: 'Rich', trend: 'flat', description: 'Text, images, links, emoji, and voice transcripts.' }
        ]}
      >
        <EnterpriseFilterBar searchLabel="Search posts, pods, resources, or families" filters={['My pods', 'School-wide', 'Teacher posts', 'Reported', 'Voice transcript']} />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <EnterprisePanel title="Community feed" description="Personalized content keeps private school and classroom context visible.">
            <EnterpriseWorkflowList
              items={[
                { label: 'STEM Night pod update', description: 'Teacher post with event signup and accessible image alt text.', status: 'School-visible', tone: 'info' },
                { label: 'Reading streak leaderboard', description: 'Badge rules explain exactly how points were earned.', status: 'Transparent', tone: 'success' },
                { label: 'Reported thread', description: 'AI moderation flagged language and sent context to the review queue.', status: 'Reviewing', tone: 'warning' }
              ]}
            />
          </EnterprisePanel>
          <EnterprisePanel title="Social controls" description="Guardians and teachers can tune what appears in the feed.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Privacy scope', description: 'Post to class, school, or private pod.' },
                { label: 'Block and report', description: 'Single-step safety controls with audit capture.' },
                { label: 'Saved searches', description: 'Persist searches for activities, posts, and events.' }
              ]}
            />
          </EnterprisePanel>
        </div>
      </EnterpriseSurface>
    </ProtectedRoute>
  );
}
