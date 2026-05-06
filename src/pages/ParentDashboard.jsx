import { useEffect, useState } from 'react';
import { listEvents } from '@/domains/events';
import { listActivities } from '@/domains/activities';
import { listThreads } from '@/domains/messaging';
import { useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';
import WeeklyFamilyBriefCard from '@/components/dashboard/WeeklyFamilyBriefCard';
import TodayActionsCard from '@/components/dashboard/TodayActionsCard';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';
import {
  completeAction,
  dismissAction,
  getLatestWeeklyBrief,
  listActions,
  runWeeklyBrief
} from '@/domains/orchestrator';

export default function ParentDashboard() {
  const userId = useUserId();
  const tenant = useTenantScope();
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [threads, setThreads] = useState([]);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!userId || tenant.isLoading) return;
      const familyId = tenant.data?.profileId || userId;
      const [eventData, activityData, threadData, briefData] = await Promise.all([
        listEvents(tenant.data?.schoolId || null).catch(() => []),
        listActivities().catch(() => []),
        tenant.data?.profileId ? listThreads(tenant.data.profileId).catch(() => []) : Promise.resolve([]),
        getLatestWeeklyBrief(familyId).catch(() => null)
      ]);
      setEvents(eventData);
      setActivities(activityData);
      setThreads(threadData);
      setBrief(briefData);
      setActionsLoading(true);
      listActions(familyId, { status: 'queued', limit: 3 })
        .then((r) => setActions(r.actions || []))
        .catch(() => setActions([]))
        .finally(() => setActionsLoading(false));
    };
    load();
  }, [userId, tenant.isLoading, tenant.data?.profileId, tenant.data?.schoolId]);

  const generateBrief = async () => {
    if (!userId) return;
    const familyId = tenant.data?.profileId || userId;
    setBriefLoading(true);
    try {
      const nextBrief = await runWeeklyBrief(familyId);
      setBrief(nextBrief);
    } finally {
      setBriefLoading(false);
    }
  };

  const refreshActions = async () => {
    if (!userId) return;
    const familyId = tenant.data?.profileId || userId;
    setActionsLoading(true);
    try {
      const r = await listActions(familyId, { status: 'queued', limit: 3 });
      setActions(r.actions || []);
    } finally {
      setActionsLoading(false);
    }
  };

  const onComplete = async (actionId) => {
    if (!userId) return;
    const familyId = tenant.data?.profileId || userId;
    setActionsLoading(true);
    try {
      await completeAction(familyId, actionId);
      await refreshActions();
    } finally {
      setActionsLoading(false);
    }
  };

  const onDismiss = async (actionId) => {
    if (!userId) return;
    const familyId = tenant.data?.profileId || userId;
    setActionsLoading(true);
    try {
      await dismissAction(familyId, actionId);
      await refreshActions();
    } finally {
      setActionsLoading(false);
    }
  };

  const nextUpItems = [
    ...events.slice(0, 2).map((event) => ({
      label: event.title,
      description: new Date(event.starts_at).toLocaleString(),
      status: 'Event',
      tone: 'info'
    })),
    ...activities.slice(0, 2).map((activity) => ({
      label: activity.title,
      description: `${activity.subject} · ${activity.grade_level}`,
      status: 'Explore',
      tone: 'success'
    })),
    ...threads.slice(0, 1).map((thread) => ({
      label: thread.subject || 'Conversation',
      description: thread.messages?.[0]?.content || 'Open the thread for details.',
      status: 'Message',
      tone: 'warning'
    }))
  ].slice(0, 3);

  return (
    <EnterpriseSurface
      eyebrow="Parent Today"
      title="Family day, simplified"
      description="The parent dashboard follows the three-card rule: weekly brief, today actions, and one consolidated next-up card."
      badges={['Three-card maximum', 'Weekly family brief', 'Unified Explore', 'Calm mode']}
      metrics={[
        { label: 'Default cards', value: '3', badge: 'Enforced', trend: 'down', description: 'The dashboard never exceeds three cards in the primary view.' },
        { label: 'Queued actions', value: String(actions.length), badge: 'Relevant', trend: 'flat', description: 'Only the most timely family actions are visible.' },
        { label: 'Next up', value: String(nextUpItems.length), badge: 'Curated', trend: 'up', description: 'Events, activities, and messages are consolidated.' },
        { label: 'Weekly brief', value: brief ? 'Ready' : 'Generate', badge: 'Pinned', trend: 'flat', description: 'The weekly snapshot stays at the top of the experience.' }
      ]}
      aside={
        <EnterpriseComplianceStrip
          items={[
            { label: 'Cognitive load guardrail', description: 'Primary view stays calm by limiting visible cards.' },
            { label: 'Privacy-safe summaries', description: 'Messages and recommendations avoid exposing sensitive details.' },
            { label: 'Unified Explore path', description: 'Activities, events, and library content roll into one Explore journey.' }
          ]}
        />
      }
    >
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Parent Today three-card view">
        <EnterprisePanel title="Weekly family brief" description="Persistent snapshot for the week.">
          <WeeklyFamilyBriefCard brief={brief} onGenerate={generateBrief} loading={briefLoading} />
        </EnterprisePanel>

        <EnterprisePanel title="Today actions" description="The highest-priority family tasks only.">
          <TodayActionsCard
            items={actions}
            onComplete={onComplete}
            onDismiss={onDismiss}
            loading={actionsLoading}
          />
        </EnterprisePanel>

        <EnterprisePanel title="Next up" description="Events, messages, and activities are consolidated into one card.">
          {nextUpItems.length > 0 ? (
            <EnterpriseWorkflowList items={nextUpItems} />
          ) : (
            <p className="text-sm text-[var(--enterprise-muted)]">No events, activities, or message threads need attention.</p>
          )}
        </EnterprisePanel>
      </section>
    </EnterpriseSurface>
  );
}
