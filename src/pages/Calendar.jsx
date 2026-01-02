import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CalendarView from '@/components/calendar/CalendarView';
import EventModal from '@/components/calendar/EventModal';
import { listEvents } from '@/domains/events';

/**
 * Teachmo Calendar page.
 *
 * Migrates the base44 calendar page into a working calendar
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
    <div className="p-6 space-y-4">
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
    </div>
  );
}
