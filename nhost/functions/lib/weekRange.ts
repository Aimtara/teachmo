export type WeekRange = {
  week_start_date: string;
  week_end_date: string;
  weekStart: Date;
  weekEnd: Date;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveWeekRange(weekStartInput?: string | null): WeekRange {
  const baseDate = weekStartInput ? parseDate(weekStartInput) : new Date();
  if (!baseDate) {
    const err = new Error('Invalid weekStart date');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const weekStart = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  const day = weekStart.getUTCDay() || 7;
  if (day !== 1) weekStart.setUTCDate(weekStart.getUTCDate() - (day - 1));

  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  return {
    week_start_date: toISODate(weekStart),
    week_end_date: toISODate(weekEnd),
    weekStart,
    weekEnd
  };
}

export function formatWeekRange({ weekStart, weekEnd }: { weekStart: Date; weekEnd: Date }) {
  const end = new Date(weekEnd.getTime());
  const opts = { month: 'long', day: 'numeric' } as const;
  const yearOpt = { year: 'numeric' } as const;
  const sameYear = weekStart.getFullYear() === end.getFullYear();

  const s = weekStart.toLocaleDateString('en-US', { ...opts, ...yearOpt });
  const e = end.toLocaleDateString('en-US', sameYear ? opts : { ...opts, ...yearOpt });
  return `${s}–${e}`;
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}
