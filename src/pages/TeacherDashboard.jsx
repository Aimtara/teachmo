import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticationStatus, useUserId } from '@nhost/react';
import { Link, Navigate } from 'react-router-dom';
import { getTeacherDashboardSummary } from '@/domains/teacherDashboard';
import { User } from '@/api/entities';
import GoogleClassroomConnect from '@/components/integration/GoogleClassroomConnect';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EnterpriseFilterBar,
  EnterpriseHeatmap,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

export default function TeacherDashboard() {
  const { isAuthenticated } = useAuthenticationStatus();
  const userId = useUserId();
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user details to pass to integration component
  // This ensures the "Connected" status is accurate on load
  useEffect(() => {
    if (isAuthenticated) {
      User.me().then(setCurrentUser).catch(console.error);
    }
  }, [isAuthenticated]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-dashboard', userId],
    enabled: isAuthenticated && Boolean(userId),
    queryFn: () => getTeacherDashboardSummary({ eventsLimit: 5, assignmentsLimit: 5 })
  });

  const classrooms = data?.classrooms ?? [];
  const events = data?.events ?? [];
  const assignments = data?.assignments ?? [];
  const greetingName = currentUser?.first_name || currentUser?.name || 'Teacher';

  // Callback to refresh dashboard data immediately after a sync occurs
  const handleConnectionUpdate = () => {
    User.me().then(setCurrentUser); // Refresh sync timestamps
    refetch(); // Refresh class/assignment lists
  };

  if (!isAuthenticated && !import.meta.env.DEV) return <Navigate to="/" replace />;

  return (
    <EnterpriseSurface
      eyebrow="Teacher triage"
      title={`Welcome back, ${greetingName}`}
      description="The teacher dashboard is now an action-oriented triage board for open messages, office hours requests, pending digests, classroom health, and roster sync status."
      badges={['Smart queues', 'Class heatmap', 'AI nudges', 'Roster sync']}
      metrics={[
        { label: 'Classrooms', value: String(classrooms.length), badge: 'Synced', trend: 'flat' },
        { label: 'Active assignments', value: String(assignments.length), badge: 'Review', trend: 'up' },
        { label: 'Upcoming events', value: String(events.length), badge: 'Scheduled', trend: 'flat' },
        { label: 'Open queues', value: '3', badge: 'Smart', trend: 'down' }
      ]}
    >
      <EnterpriseFilterBar searchLabel="Search students, classes, assignments, or families" filters={['Needs reply', 'Office hours', 'Missing work', 'Digest drafts', 'AI nudge']} />

      {/* CRITICAL FEATURE FIX: Google Classroom Integration Section */}
      <EnterprisePanel title="Roster and Classroom sync" description="Google Classroom connection remains prominent because it feeds the triage board.">
        <GoogleClassroomConnect 
          user={currentUser} 
          onConnectionUpdate={handleConnectionUpdate} 
        />
      </EnterprisePanel>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="text-red-600" role="alert">
          Unable to load teacher data. {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <EnterprisePanel title="Smart queues" description="Daily teacher work is grouped by urgency rather than by feature area.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Open parent messages', status: '7 open', tone: 'warning' },
                { label: 'Office hours requests', status: '4 pending', tone: 'info' },
                { label: 'Pending weekly digests', status: '3 drafts', tone: 'success' }
              ]}
            />
          </EnterprisePanel>

          <EnterprisePanel title="Class health heatmap" description="Quickly spot missing work or low family engagement.">
            <EnterpriseHeatmap
              title="Class health heatmap"
              rows={[
                { label: 'Math 7A', values: [92, 74, 51, 83, 66] },
                { label: 'Science', values: [61, 47, 88, 79, 42] },
                { label: 'Advisory', values: [86, 91, 72, 56, 69] }
              ]}
            />
          </EnterprisePanel>

          <div className="grid gap-4 md:grid-cols-2 xl:col-span-2 xl:grid-cols-3">
          {/* Classrooms List */}
          <div className="rounded-xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Classrooms</h2>
            <ul className="space-y-2 text-sm">
              {classrooms.map((classroom) => (
                <li key={classroom.id} className="rounded-lg bg-slate-50 p-3 flex items-center justify-between">
                  <Link
                    to={createPageUrl('TeacherAssignments', { course_id: classroom.id })}
                    className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
                  >
                    {classroom.name}
                  </Link>
                </li>
              ))}
              {classrooms.length === 0 && (
                <li className="text-sm text-gray-500">No classrooms assigned. Sync to import.</li>
              )}
            </ul>
          </div>

          {/* NEW: Active Assignments Display */}
          <div className="rounded-xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Active Assignments</h2>
            <ul className="space-y-2 text-sm">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-900 line-clamp-1">{assignment.title}</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {assignment.submissions_aggregate?.aggregate?.count || 0} Subs
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{assignment.classroom?.name}</span>
                    <span>Due {new Date(assignment.due_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
              {assignments.length === 0 && (
                <li className="text-sm text-gray-500">
                  No active assignments. Click Sync Assignments above to update.
                </li>
              )}
            </ul>
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upcoming Events</h2>
            <ul className="space-y-2 text-sm">
              {events.map((event) => (
                <li key={event.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-600">
                    {event.classroom?.name ? `${event.classroom.name} · ` : ''}
                    {new Date(event.starts_at).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </li>
              ))}
              {events.length === 0 && (
                <li className="text-sm text-gray-500">No upcoming events found.</li>
              )}
            </ul>
          </div>
          </div>
        </div>
      )}
    </EnterpriseSurface>
  );
}
