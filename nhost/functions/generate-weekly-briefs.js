/* eslint-env node */

import {
  summarizeWeeklyInputs,
  determineUxState,
  generateBriefWithLLM,
  renderBriefHtml,
  renderBriefText
} from './lib/weeklyBrief.js';
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
    week_end_date: toISODate(weekEnd),
    weekStart,
    weekEnd
  };
}

function formatWeekRange({ weekStart, weekEnd }) {
  const end = new Date(weekEnd.getTime());
  const opts = { month: 'long', day: 'numeric' };
  const yearOpt = { year: 'numeric' };
  const sameYear = weekStart.getFullYear() === end.getFullYear();

  const s = weekStart.toLocaleDateString('en-US', { ...opts, ...yearOpt });
  const e = end.toLocaleDateString('en-US', sameYear ? opts : { ...opts, ...yearOpt });
  return `${s}–${e}`;
}

async function loadSchoolEvents({ schoolId, weekStart, weekEnd }) {
  if (!schoolId) return [];

  const query = `query WeeklyBriefEvents($schoolId: uuid!, $start: timestamptz!, $end: timestamptz!) {
    calendar_events(
      where: { school_id: { _eq: $schoolId }, starts_at: { _gte: $start, _lt: $end } }
      order_by: { starts_at: asc }
      limit: 200
    ) {
      id
      title
      description
      starts_at
    }
  }`;

  const data = await hasuraRequest({
    query,
    variables: {
      schoolId,
      start: weekStart.toISOString(),
      end: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  });

  return data?.calendar_events ?? [];
}

export default async (req, res) => {
  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    assertAdminRole(req);

    const { weekStart, dryRun = false, limit } = req.body || {};
    const { week_start_date, week_end_date, weekStart: weekStartDate, weekEnd: weekEndDate } = resolveWeekRange(weekStart);

    const organizationId = req.headers['x-hasura-organization-id']
      ? String(req.headers['x-hasura-organization-id'])
      : null;
    const schoolId = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

    const where = {
      guardian: {
        app_role: { _eq: 'parent' },
        ...(organizationId ? { organization_id: { _eq: organizationId } } : {}),
        ...(schoolId ? { school_id: { _eq: schoolId } } : {})
      }
    };

    const query = `query WeeklyBriefParents($where: guardian_children_bool_exp!, $limit: Int) {
      guardian_children(where: $where, limit: $limit) {
        guardian_id
        child_id
        guardian {
          user_id
          organization_id
          school_id
        }
        child {
          id
          first_name
          birthdate
        }
      }
    }`;

    const data = await hasuraRequest({
      query,
      variables: {
        where,
        limit: Number.isFinite(limit) ? Number(limit) : null
      }
    });

    const rows = data?.guardian_children ?? [];
    const results = [];
    const eventCache = new Map();

    for (const row of rows) {
      const parentUserId = row?.guardian?.user_id;
      const childId = row?.child?.id || row?.child_id;
      if (!parentUserId || !childId) continue;

      const child = row?.child || {};
      const schoolKey = row?.guardian?.school_id || null;

      try {
        let schoolEvents = [];
        if (schoolKey) {
          if (!eventCache.has(schoolKey)) {
            const events = await loadSchoolEvents({ schoolId: schoolKey, weekStart: weekStartDate, weekEnd: weekEndDate });
            eventCache.set(schoolKey, events);
          }
          schoolEvents = eventCache.get(schoolKey) || [];
        }

        const summary = summarizeWeeklyInputs({
          week_start: week_start_date,
          week_end: week_end_date,
          child: {
            id: childId,
            first_name: child.first_name || null,
            birthdate: child.birthdate || null
          },
          school_events: schoolEvents,
          announcements: [],
          messages: []
        });

        const prevWeekStart = new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const historyQuery = `
          query WeeklyBriefHistory($parent: uuid!, $child: uuid!, $prevStart: date!) {
            history: weekly_briefs_aggregate(where: {parent_user_id: {_eq: $parent}, child_id: {_eq: $child}}) {
              aggregate { count }
            }
            prev: weekly_briefs(where: {parent_user_id: {_eq: $parent}, child_id: {_eq: $child}, week_start: {_eq: $prevStart}}, limit: 1) {
              id
              opened_at
            }
          }
        `;

        const history = await hasuraRequest({
          query: historyQuery,
          variables: { parent: parentUserId, child: childId, prevStart: toISODate(prevWeekStart) }
        });

        const hasHistory = Number(history?.history?.aggregate?.count || 0) > 0;
        const missedLastWeek = !!(history?.prev?.[0] && !history.prev[0].opened_at);
        const uxState = determineUxState({ hasHistory, missedLastWeek, loadScore: summary.load_score });
        const weekRange = formatWeekRange({ weekStart: weekStartDate, weekEnd: weekEndDate });

        const { draft, used_fallback, fallback_reason } = await generateBriefWithLLM({
          weekRange,
          uxState,
          summary
        });

        const content_html = renderBriefHtml({ weekRange, draft });
        const content_text = renderBriefText({ weekRange, draft });

        const object = {
          parent_user_id: parentUserId,
          child_id: childId,
          week_start: week_start_date,
          week_end: week_end_date,
          week_range: weekRange,
          ux_state: uxState,
          load_score: summary.load_score,
          shape_of_the_week: draft.shape_of_the_week,
          school_things_to_know: draft.school_things_to_know || [],
          moment_to_protect: draft.moment_to_protect,
          gentle_heads_up: draft.gentle_heads_up,
          tiny_connection_idea: draft.tiny_connection_idea,
          content_html,
          content_text,
          raw_inputs: { ...summary, generator: { used_fallback, fallback_reason: fallback_reason || null } },
          generated_at: new Date().toISOString()
        };

        let saved = null;
        if (!dryRun) {
          const mutation = `
            mutation UpsertWeeklyBrief($object: weekly_briefs_insert_input!) {
              insert_weekly_briefs_one(
                object: $object,
                on_conflict: {
                  constraint: weekly_briefs_parent_user_id_child_id_week_start_key,
                  update_columns: [
                    ux_state,
                    load_score,
                    shape_of_the_week,
                    school_things_to_know,
                    moment_to_protect,
                    gentle_heads_up,
                    tiny_connection_idea,
                    content_html,
                    content_text,
                    raw_inputs,
                    generated_at
                  ]
                }
              ) {
                id
                ux_state
                generated_at
              }
            }
          `;

          saved = await hasuraRequest({ query: mutation, variables: { object } });
        }

        results.push({
          parent_user_id: parentUserId,
          child_id: childId,
          ux_state: uxState,
          week_start: week_start_date,
          week_end: week_end_date,
          used_fallback: !!used_fallback,
          saved_id: saved?.insert_weekly_briefs_one?.id || null
        });
      } catch (error) {
        results.push({
          parent_user_id: parentUserId,
          child_id: childId,
          error: error?.message || 'Failed to generate brief'
        });
      }
    }

    return res.status(200).json({
      ok: true,
      week_start_date,
      week_end_date,
      dryRun,
      generated: results.length,
      results
    });
  } catch (err) {
    console.error('generate-weekly-briefs error', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Unexpected error' });
  }
};
