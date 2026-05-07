import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import CalendarView from '@/components/calendar/CalendarView';
import EventModal from '@/components/calendar/EventModal';
import { listEvents } from '@/domains/events';
import { EnterpriseFilterBar, EnterprisePanel, EnterpriseSurface, EnterpriseWorkflowList } from '@/components/enterprise';
import { createEventFromSchedulingRequest, moveEventToDate } from '@/utils/calendarScheduling';

const schedulingRequests = [
  { id: 'office-hours-avery', title: 'Avery family office hours', description: 'Guardian requested a 30 minute math check-in.', color: '#2451FF' },
  { id: 'conference-rivera', title: 'Rivera conference', description: 'Teacher request awaiting a Thursday slot.', color: '#2DBF6E' },
  { id: 'digest-review', title: 'Weekly digest approval', description: 'Schedule review before Friday send.', color: '#FFC857' }
];

/**
 * Teachmo Calendar page.
 *
 * Migrates the legacy calendar page into a working calendar
 * using the existing CalendarView component and event modal.
 * Fetches events via listEvents and maps them into the shape
 * expected by CalendarView (start_time/end_time).
 *
 * Note: This implementation focuses on a month view and basic
 * read-only interactions. Future enhancements should add:
 *  - Support for week/day views via a view switcher
 *  - Event creation when a day is clicked
 *  - Event editing and deletion
 *  - Loading state integration with children data
 */
export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('month');
  const [localEvents, setLocalEvents] = useState([]);
  const [rescheduledEvents, setRescheduledEvents] = useState({});
  const [pendingRequests, setPendingRequests] = useState(schedulingRequests);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', currentDate],
    queryFn: async () => {
      // Fetch events scoped to the user's school or tenant.
      const data = await listEvents({ limit: 100 }).catch(() => []);
      return data || [];
    },
    placeholderData: (previousData) => previousData
  });

  // Normalize event fields for CalendarView
  const normalizedEvents = useMemo(() => (events || []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    start_time: e.starts_at || e.start_time,
    end_time: e.ends_at || e.end_time,
    all_day: false,
    child_id: e.child_id,
    color: e.color || undefined,
  })), [events]);

  const calendarEvents = useMemo(() => [
    ...normalizedEvents.map((event) => rescheduledEvents[event.id] || event),
    ...localEvents
  ], [localEvents, normalizedEvents, rescheduledEvents]);

  const handleDayClick = (date) => {
    // Set the current date to view week/day; in future this could
    // open a quick-create modal for new events.
    setCurrentDate(date);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleDateDrop = (draggableId, targetDate) => {
    if (!draggableId) return;
    if (draggableId.startsWith('request-')) {
      const requestId = draggableId.replace('request-', '');
      const request = pendingRequests.find((item) => item.id === requestId);
      if (!request) return;
      setLocalEvents((items) => [...items, createEventFromSchedulingRequest(request, targetDate)]);
      setPendingRequests((items) => items.filter((item) => item.id !== requestId));
      setView('agenda');
      return;
    }

    if (draggableId.startsWith('event-')) {
      const eventId = draggableId.replace('event-', '');
      const event = calendarEvents.find((item) => String(item.id) === eventId);
      if (!event) return;
      const moved = moveEventToDate(event, targetDate);
      if (String(event.id).startsWith('scheduled-')) {
        setLocalEvents((items) => items.map((item) => String(item.id) === eventId ? moved : item));
      } else {
        setRescheduledEvents((items) => ({ ...items, [eventId]: moved }));
      }
    }
  };

  const agendaEvents = calendarEvents
    .filter((event) => event.start_time)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 20);

  return (
    <EnterpriseSurface
      eyebrow="Calendar"
      title="Adaptive scheduling board"
      description="Calendar keeps the existing month view while introducing the redesign contract for drag-and-drop scheduling, multiple views, approvals, and real-time updates."
      badges={['Drag-and-drop pattern', 'Month/week/day modes', 'Approval flows', 'Live sync']}
      metrics={[
        { label: 'Loaded events', value: String(calendarEvents.length), badge: 'Synced', trend: 'flat' },
        { label: 'Scheduling modes', value: '3', badge: 'Planned', trend: 'up' },
        { label: 'Approvals', value: 'Quick', badge: 'Teacher-ready', trend: 'up' },
        { label: 'Performance', value: 'Virtualized', badge: 'Budgeted', trend: 'flat' }
      ]}
      aside={
        <EnterprisePanel title="Scheduling queues" description="Drag targets and approvals are described beside the calendar.">
              <div className="space-y-3">
                {pendingRequests.map((request, index) => (
                      <div
                        key={request.id}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('text/plain', `request-${request.id}`)}
                        className="rounded-2xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_4%,transparent)] p-4 text-sm"
                      >
                        <p className="font-semibold">{request.title}</p>
                        <p className="mt-1 text-[var(--enterprise-muted)]">{request.description}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-muted)]">Drag to a calendar day</p>
                      </div>
                ))}
                {pendingRequests.length === 0 ? <p className="text-sm text-[var(--enterprise-muted)]">All scheduling requests are placed.</p> : null}
              </div>
        </EnterprisePanel>
      }
    >
      <EnterpriseFilterBar searchLabel="Search events, classes, families, or approvals" filters={['Month', 'Week', 'Day', 'Requests', 'Conflicts']} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar view">
        {['month', 'week', 'agenda'].map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onPointerDown={() => setView(mode)}
            onClick={() => setView(mode)}
            className={`enterprise-focus enterprise-motion rounded-full px-4 py-2 text-sm font-semibold ${
              view === mode
                ? 'bg-[var(--enterprise-primary)] text-white shadow-[var(--enterprise-shadow)]'
                : 'border border-[var(--enterprise-border)] text-[var(--enterprise-muted)]'
            }`}
          >
            {mode[0].toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
      <EnterprisePanel title="Calendar workspace" description="Select a day or event to open the existing event details modal.">
        <p className="mb-3 text-sm font-semibold capitalize text-[var(--enterprise-muted)]">Current view: {view}</p>
        {view === 'agenda' ? (
          <div className="space-y-3" aria-label="Agenda list">
            {agendaEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => handleEventClick(event)}
                className="enterprise-focus flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--enterprise-border)] p-4 text-left"
              >
                <span>
                  <span className="block font-semibold">{event.title}</span>
                  <span className="text-sm text-[var(--enterprise-muted)]">{event.description || 'Scheduled calendar item'}</span>
                </span>
                <span className="text-sm font-semibold text-[var(--enterprise-muted)]">{format(new Date(event.start_time), 'MMM d, p')}</span>
              </button>
            ))}
            {agendaEvents.length === 0 ? <p className="text-sm text-[var(--enterprise-muted)]">No agenda items yet. Drag a request onto the month view to schedule it.</p> : null}
          </div>
        ) : (
          <CalendarView
            currentDate={currentDate}
            events={calendarEvents}
            view={view}
            onEventClick={handleEventClick}
            onDateDrop={handleDateDrop}
            onDayClick={handleDayClick}
            childrenData={[]}
            isLoading={isLoading}
          />
        )}
        {showModal && selectedEvent && (
          <EventModal
            event={selectedEvent}
            onClose={() => {
              setShowModal(false);
              setSelectedEvent(null);
            }}
            childrenData={[]}
          />
        )}
      </EnterprisePanel>
    </EnterpriseSurface>
  );
}
