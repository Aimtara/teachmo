/* eslint-env node */

import { hasuraRequest } from './lib/hasura.js';
import { assertAdminRole } from './lib/roles.js';

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function resolveWeekRange(weekStartInput) {
  const baseDate = weekStartInput ? parseDate(weekStartInput) : new Date();
  if (!baseDate) {
    const err = new Error('Invalid weekStart date');
    // @ts-ignore
    err.statusCode = 400;
    throw err;
  }

  const weekStart = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  const day = weekStart.getUTCDay() || 7;
  if (day !== 1) weekStart.setUTCDate(weekStart.getUTCDate() - (day - 1));

  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  return {
    week_start_date: toISODate(weekStart),
    week_end_date: toISODate(weekEnd)
  };
}

export default async (req, res) => {
  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    assertAdminRole(req);

    const { weekStart } = req.body || {};
    const { week_start_date, week_end_date } = resolveWeekRange(weekStart);

    const query = `
      query WeeklyBriefInsights($weekStart: date!) {
        weekly_briefs_aggregate(where: { week_start: { _eq: $weekStart } }) {
          aggregate { count }
        }
        weekly_briefs(
          where: { week_start: { _eq: $weekStart } }
          order_by: { generated_at: desc }
          limit: 5
        ) {
          id
          parent_user_id
          child_id
          ux_state
          generated_at
          open_count
          opened_at
        }
      }
    `;

    const data = await hasuraRequest({ query, variables: { weekStart: week_start_date } });

    return res.status(200).json({
      ok: true,
      week_start_date,
      week_end_date,
      count: data?.weekly_briefs_aggregate?.aggregate?.count || 0,
      recent: data?.weekly_briefs || []
    });
  } catch (err) {
    console.error('insights-weekly error', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Unexpected error' });
  }
};
