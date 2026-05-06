import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CalendarView from '@/components/calendar/CalendarView';
import EventModal from '@/components/calendar/EventModal';
import { listEvents } from '@/domains/events';
import { EnterpriseFilterBar, EnterprisePanel, EnterpriseSurface, EnterpriseWorkflowList } from '@/components/enterprise';

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

  const { data: events = [], isLoading } = useQuery(['events', currentDate], async () => {
    // Fetch events scoped to the user's school or tenant.
    const data = await listEvents({ limit: 100 });
    return data || [];
  }, {
    keepPreviousData: true
  });

  // Normalize event fields for CalendarView
  const calendarEvents = (events || []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    start_time: e.starts_at || e.start_time,
    end_time: e.ends_at || e.end_time,
    all_day: false,
    child_id: e.child_id,
    color: e.color || undefined,
  }));

  const handleDayClick = (date) => {
    // Set the current date to view week/day; in future this could
    // open a quick-create modal for new events.
    setCurrentDate(date);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

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
          <EnterpriseWorkflowList
            items={[
              { label: 'Office hours requests', status: '4 pending', tone: 'warning' },
              { label: 'Family conference slots', status: 'Ready', tone: 'success' },
              { label: 'Sync health', status: 'Live', tone: 'info' }
            ]}
          />
        </EnterprisePanel>
      }
    >
      <EnterpriseFilterBar searchLabel="Search events, classes, families, or approvals" filters={['Month', 'Week', 'Day', 'Requests', 'Conflicts']} />
      <EnterprisePanel title="Calendar workspace" description="Select a day or event to open the existing event details modal.">
        <CalendarView
          currentDate={currentDate}
          events={calendarEvents}
          view="month"
          onEventClick={handleEventClick}
          onDayClick={handleDayClick}
          childrenData={[]}
          isLoading={isLoading}
        />
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
