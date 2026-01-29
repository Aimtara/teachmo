import { useQuery } from '@tanstack/react-query';
import { useAuthenticationStatus, useUserId } from '@nhost/react';
import { Navigate } from 'react-router-dom';
import { graphqlRequest } from '@/lib/graphql';

export default function TeacherDashboard() {
  const { isAuthenticated } = useAuthenticationStatus();
  const userId = useUserId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-dashboard', userId],
    enabled: isAuthenticated && Boolean(userId),
    queryFn: async () => {
      const query = `query TeacherDashboard($eventsLimit: Int) {
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
      }`;

      return graphqlRequest({ query, variables: { eventsLimit: 5 } });
    }
  });

  const classrooms = data?.classrooms ?? [];
  const events = data?.events ?? [];

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-gray-900">Teacher dashboard</h1>
        <p className="text-gray-600">Manage classrooms and stay ahead of upcoming events.</p>
      </header>

      {isLoading && <p className="text-gray-600">Loading classroom data…</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Unable to load teacher data. {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your classrooms</h2>
            <ul className="space-y-2 text-sm">
              {classrooms.map((classroom) => (
                <li key={classroom.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-gray-900">{classroom.name}</p>
                </li>
              ))}
              {classrooms.length === 0 && (
                <li className="text-sm text-gray-500">No classrooms are assigned yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upcoming events</h2>
            <ul className="space-y-2 text-sm">
              {events.map((event) => (
                <li key={event.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-600">
                    {event.classroom?.name ? `${event.classroom.name} · ` : ''}
                    {new Date(event.starts_at).toLocaleString()}
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
