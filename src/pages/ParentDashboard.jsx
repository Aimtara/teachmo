import { useEffect, useState } from 'react';
import { listEvents } from '@/domains/events';
import { listActivities } from '@/domains/activities';
import { listThreads } from '@/domains/messaging';
import { useUserData } from '@nhost/react';
import WeeklyBriefCard from '@/components/dashboard/WeeklyBriefCard.jsx';

export default function ParentDashboard() {
  const user = useUserData();
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [eventData, activityData, threadData] = await Promise.all([
        listEvents(user.default_school_id || null).catch(() => []),
        listActivities().catch(() => []),
        listThreads(user.profile_id || user.id).catch(() => [])
      ]);
      setEvents(eventData);
      setActivities(activityData);
      setThreads(threadData);
    };
    load();
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Parent dashboard</h1>
        <p className="text-gray-600">Keep up with events, activities, and conversations.</p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <WeeklyBriefCard />
        </div>

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
