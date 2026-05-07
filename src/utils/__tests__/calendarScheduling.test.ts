import { buildEventPersistencePayload, createEventFromSchedulingRequest, moveEventToDate } from '../calendarScheduling';

describe('calendarScheduling', () => {
  it('moves an event to a new day while preserving time and duration', () => {
    const moved = moveEventToDate(
      {
        id: 'event-1',
        title: 'Conference',
        start_time: '2026-05-06T16:30:00.000Z',
        end_time: '2026-05-06T17:15:00.000Z'
      },
      new Date('2026-05-09T12:00:00.000Z')
    );

    expect(moved.start_time).toBe('2026-05-09T16:30:00.000Z');
    expect(moved.end_time).toBe('2026-05-09T17:15:00.000Z');
    expect(moved.starts_at).toBe(moved.start_time);
    expect(moved.ends_at).toBe(moved.end_time);
  });

  it('creates a scheduled calendar event from a request', () => {
    const event = createEventFromSchedulingRequest(
      { id: 'office-hours', title: 'Office hours', description: 'Family requested time' },
      new Date('2026-05-10T12:00:00.000Z')
    );

    expect(event).toMatchObject({
      id: 'scheduled-office-hours',
      title: 'Office hours',
      description: 'Family requested time',
      source_request_id: 'office-hours',
      all_day: false
    });
    expect(event.start_time).toBe('2026-05-10T15:00:00.000Z');
    expect(event.end_time).toBe('2026-05-10T15:30:00.000Z');
  });

  it('builds a minimal events insert payload from a scheduled request', () => {
    const event = createEventFromSchedulingRequest(
      { id: 'conference', title: 'Conference', description: 'Family conference' },
      new Date('2026-05-11T12:00:00.000Z')
    );

    expect(buildEventPersistencePayload(event)).toEqual({
      title: 'Conference',
      description: 'Family conference',
      starts_at: '2026-05-11T15:00:00.000Z',
      ends_at: '2026-05-11T15:30:00.000Z'
    });
  });
});
