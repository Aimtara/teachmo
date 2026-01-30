import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticationStatus, useUserId } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { graphqlRequest } from '@/lib/graphql';
import { User } from '@/api/entities';
import GoogleClassroomConnect from '@/components/integration/GoogleClassroomConnect';
import { Badge } from '@/components/ui/badge';

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
    queryFn: async () => {
      // Updated query to include assignments and submission aggregates
      const query = `query TeacherDashboard($eventsLimit: Int, $assignmentsLimit: Int) {
        classrooms(order_by: { name: asc }) {
          id
          name
        }
        events(order_by: { starts_at: asc }, limit: $eventsLimit) {
          id
          title
          starts_at
          classroom {
            name
          }
        }
        assignments(
          order_by: { due_at: asc }, 
          limit: $assignmentsLimit, 
          where: { status: { _eq: "active" } }
        ) {
          id
          title
          due_at
          classroom {
            name
          }
          submissions_aggregate {
            aggregate {
              count
            }
          }
        }
      }`;

      return graphqlRequest({ query, variables: { eventsLimit: 5, assignmentsLimit: 5 } });
    }
  });

  const classrooms = data?.classrooms ?? [];
  const events = data?.events ?? [];
  const assignments = data?.assignments ?? [];

  // Callback to refresh dashboard data immediately after a sync occurs
  const handleConnectionUpdate = () => {
    User.me().then(setCurrentUser); // Refresh sync timestamps
    refetch(); // Refresh class/assignment lists
  };

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Teacher dashboard</h1>
        <p className="text-gray-600">Manage classrooms, sync assignments, and stay ahead of upcoming events.</p>
      </header>

      {/* CRITICAL FEATURE FIX: Google Classroom Integration Section */}
      <section>
        <GoogleClassroomConnect 
          user={currentUser} 
          onConnectionUpdate={handleConnectionUpdate} 
        />
      </section>

      {isLoading && <p className="text-gray-600">Loading dashboard data…</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Unable to load teacher data. {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Classrooms List */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Classrooms</h2>
            <ul className="space-y-2 text-sm">
              {classrooms.map((classroom) => (
                <li key={classroom.id} className="rounded-lg bg-slate-50 p-3 flex items-center justify-between">
                  <p className="font-medium text-gray-900">{classroom.name}</p>
                </li>
              ))}
              {classrooms.length === 0 && (
                <li className="text-sm text-gray-500">No classrooms assigned. Sync to import.</li>
              )}
            </ul>
          </div>

          {/* NEW: Active Assignments Display */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
                  No active assignments. Click "Sync Assignments" above to update.
                </li>
              )}
            </ul>
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
      )}
    </div>
  );
}
