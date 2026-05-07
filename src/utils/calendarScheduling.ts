type CalendarLikeEvent = {
  id?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  starts_at?: string;
  ends_at?: string;
  color?: string;
  [key: string]: unknown;
};

export function moveEventToDate(event: CalendarLikeEvent, targetDate: Date): CalendarLikeEvent {
  const start = new Date(String(event.start_time ?? event.starts_at ?? new Date().toISOString()));
  const end = new Date(String(event.end_time ?? event.ends_at ?? start.getTime() + 60 * 60 * 1000));
  const durationMs = Number.isFinite(end.getTime()) && Number.isFinite(start.getTime())
    ? Math.max(end.getTime() - start.getTime(), 30 * 60 * 1000)
    : 60 * 60 * 1000;

  const nextStart = new Date(targetDate);
  nextStart.setHours(
    Number.isFinite(start.getTime()) ? start.getHours() : 15,
    Number.isFinite(start.getTime()) ? start.getMinutes() : 0,
    0,
    0
  );
  const nextEnd = new Date(nextStart.getTime() + durationMs);

  return {
    ...event,
    start_time: nextStart.toISOString(),
    end_time: nextEnd.toISOString(),
    starts_at: nextStart.toISOString(),
    ends_at: nextEnd.toISOString()
  };
}

export function createEventFromSchedulingRequest(
  request: { id: string; title: string; description?: string; color?: string },
  targetDate: Date
): CalendarLikeEvent {
  const start = new Date(targetDate);
  start.setHours(15, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    id: `scheduled-${request.id}`,
    title: request.title,
    description: request.description,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    all_day: false,
    color: request.color ?? '#2451FF',
    source_request_id: request.id
  };
}
