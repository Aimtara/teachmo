import { useEffect, useState } from 'react';
import { listEvents } from '@/domains/events';
import { listActivities } from '@/domains/activities';
import { listThreads } from '@/domains/messaging';
import { useUserId } from '@nhost/react';
import { useTenantScope } from '@/hooks/useTenantScope';
import WeeklyFamilyBriefCard from '@/components/dashboard/WeeklyFamilyBriefCard';
import TodayActionsCard from '@/components/dashboard/TodayActionsCard';
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

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Parent dashboard</h1>
        <p className="text-gray-600">Keep up with events, activities, and conversations.</p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <WeeklyFamilyBriefCard brief={brief} onGenerate={generateBrief} loading={briefLoading} />

        <TodayActionsCard
          items={actions}
          onComplete={onComplete}
          onDismiss={onDismiss}
          loading={actionsLoading}
        />

        <div className="bg-white shadow rounded p-4">
          <h2 className="font-medium mb-2">Upcoming events</h2>
          <ul className="space-y-2 text-sm">
            {events.map((event) => (
              <li key={event.id} className="border-b pb-2 last:border-0">
                <p className="font-semibold">{event.title}</p>
                <p className="text-gray-500">{new Date(event.starts_at).toLocaleString()}</p>
              </li>
            ))}
            {events.length === 0 && <p className="text-gray-500">No events scheduled.</p>}
          </ul>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="font-medium mb-2">Activities & library</h2>
          <ul className="space-y-2 text-sm">
            {activities.map((activity) => (
              <li key={activity.id} className="border-b pb-2 last:border-0">
                <p className="font-semibold">{activity.title}</p>
                <p className="text-gray-500">{activity.subject} · {activity.grade_level}</p>
              </li>
            ))}
            {activities.length === 0 && <p className="text-gray-500">Browse curated activities once your library is loaded.</p>}
          </ul>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="font-medium mb-2">Messages</h2>
          <ul className="space-y-2 text-sm">
            {threads.map((thread) => (
              <li key={thread.id} className="border-b pb-2 last:border-0">
                <p className="font-semibold">{thread.subject || 'Conversation'}</p>
                {thread.messages?.[0] && (
                  <p className="text-gray-500 truncate">{thread.messages[0].content}</p>
                )}
              </li>
            ))}
            {threads.length === 0 && <p className="text-gray-500">Start a message thread from the Messages section.</p>}
          </ul>
        </div>
      </section>
    </div>
  );
}
