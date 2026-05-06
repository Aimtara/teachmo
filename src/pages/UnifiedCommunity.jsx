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
          { label: 'Active pods', value: '18', badge: 'Personalized', trend: 'up' },
          { label: 'Moderation SLA', value: '<1m', badge: 'Queued', trend: 'up' },
          { label: 'Leaderboard clarity', value: '100%', badge: 'Explained', trend: 'flat' },
          { label: 'Post types', value: '5', badge: 'Rich', trend: 'flat' }
        ]}
      >
        <EnterpriseFilterBar searchLabel="Search posts, pods, resources, or families" filters={['My pods', 'School-wide', 'Teacher posts', 'Reported', 'Voice transcript']} />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <EnterprisePanel title="Community feed" description="Personalized content keeps private school and classroom context visible.">
            <EnterpriseWorkflowList
              items={[
                { label: 'STEM Night pod update', status: 'School-visible', tone: 'info' },
                { label: 'Reading streak leaderboard', status: 'Transparent', tone: 'success' },
                { label: 'Reported thread', status: 'Reviewing', tone: 'warning' }
              ]}
            />
          </EnterprisePanel>
          <EnterprisePanel title="Social controls" description="Guardians and teachers can tune what appears in the feed.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Privacy scope' },
                { label: 'Block and report' },
                { label: 'Saved searches' }
              ]}
            />
          </EnterprisePanel>
        </div>
      </EnterpriseSurface>
    </ProtectedRoute>
  );
}
