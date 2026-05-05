import CalendarView from './CalendarView';

const currentDate = new Date('2026-05-05T12:00:00Z');
const events = [
  {
    id: 'office-hours',
    title: 'Office hours',
    start_time: '2026-05-05T15:00:00Z',
    end_time: '2026-05-05T16:00:00Z',
    type: 'office_hours',
  },
  {
    id: 'science-fair',
    title: 'Science fair checkpoint',
    start_time: '2026-05-07T18:00:00Z',
    end_time: '2026-05-07T19:00:00Z',
    type: 'assignment',
  },
  {
    id: 'conference',
    title: 'Family conference night',
    start_time: '2026-05-15T00:00:00Z',
    end_time: '2026-05-15T23:59:00Z',
    all_day: true,
    type: 'school',
  },
];

export default {
  title: 'Launch Critical/Calendar/Calendar View',
  component: CalendarView,
  parameters: {
    layout: 'fullscreen',
  },
};

export const MonthWithOfficeHours = {
  args: {
    currentDate,
    events,
    isLoading: false,
    view: 'month',
    onEventClick: () => {},
    onDayClick: () => {},
  },
};

export const WeekSchedule = {
  args: {
    currentDate,
    events,
    isLoading: false,
    view: 'week',
    onEventClick: () => {},
    onDayClick: () => {},
  },
};
