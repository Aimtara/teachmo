/* eslint-env node */

import {
  summarizeWeeklyInputs,
  determineUxState,
  generateBriefWithLLM,
  renderBriefHtml,
  renderBriefText
} from './lib/weeklyBrief';
import { hasuraRequest } from './lib/hasura.js';
import { assertAdminRole, getHasuraUserId } from './lib/roles.js';
import { formatWeekRange, resolveWeekRange, toISODate } from './lib/weekRange';
import { notifyUserEvent } from './_shared/notifier';
import { createHasuraClient } from './_shared/hasuraClient';
import type {
  WeeklyBriefEventsResponse,
  WeeklyBriefHistoryResponse,
  WeeklyBriefParentsResponse,
  WeeklyBriefRunInsertResponse,
  WeeklyBriefUpsertResponse
} from './_shared/weeklyBriefTypes';

async function loadSchoolEvents({ schoolId, weekStart, weekEnd }: { schoolId: string | null; weekStart: Date; weekEnd: Date }) {
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

  const data = (await hasuraRequest({
    query,
    variables: {
      schoolId,
      start: weekStart.toISOString(),
      end: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  })) as WeeklyBriefEventsResponse;

  return data?.calendar_events ?? [];
}

export default async (req: any, res: any) => {
  let runId = null;
  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const createdByRole = assertAdminRole(req);

    const { weekStart, dryRun = false, limit } = req.body || {};
    const { week_start_date, week_end_date, weekStart: weekStartDate, weekEnd: weekEndDate } = resolveWeekRange(weekStart);
    const hasura = await createHasuraClient();

    const organizationId = req.headers['x-hasura-organization-id']
      ? String(req.headers['x-hasura-organization-id'])
      : null;
    const schoolId = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;
    const trigger = req.body?.trigger || 'manual';
    const createdByUserId = getHasuraUserId(req);

    const runInsert = `
      mutation InsertWeeklyBriefRun($object: weekly_brief_runs_insert_input!) {
        insert_weekly_brief_runs_one(object: $object) {
          id
        }
      }
    `;

    const runData = (await hasuraRequest({
      query: runInsert,
      variables: {
        object: {
          organization_id: organizationId,
          school_id: schoolId,
          week_start_date,
          week_end_date,
          trigger,
          dry_run: Boolean(dryRun),
          status: 'STARTED',
          started_at: new Date().toISOString(),
          created_by_user_id: createdByUserId,
          created_by_role: createdByRole,
          metadata: {}
        }
      }
    })) as WeeklyBriefRunInsertResponse;

    runId = runData?.insert_weekly_brief_runs_one?.id ?? null;

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

    const data = (await hasuraRequest({
      query,
      variables: {
        where,
        limit: Number.isFinite(limit) ? Number(limit) : null
      }
    })) as WeeklyBriefParentsResponse;

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

        const history = (await hasuraRequest({
          query: historyQuery,
          variables: { parent: parentUserId, child: childId, prevStart: toISODate(prevWeekStart) }
        })) as WeeklyBriefHistoryResponse;

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

        let saved: WeeklyBriefUpsertResponse | null = null;
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

          saved = (await hasuraRequest({ query: mutation, variables: { object } })) as WeeklyBriefUpsertResponse;
          if (saved?.insert_weekly_briefs_one?.id) {
            await notifyUserEvent({
              hasura,
              userId: parentUserId,
              type: 'weekly_brief_ready',
              title: 'Your weekly brief is ready',
              body: `Your weekly brief for ${weekRange} is ready to view.`,
              metadata: {
                week_start: week_start_date,
                week_end: week_end_date,
                child_id: childId,
                brief_id: saved.insert_weekly_briefs_one.id
              }
            });
          }
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

    if (runId) {
      const runUpdate = `
        mutation UpdateWeeklyBriefRun($id: uuid!, $changes: weekly_brief_runs_set_input!) {
          update_weekly_brief_runs_by_pk(pk_columns: { id: $id }, _set: $changes) {
            id
          }
        }
      `;

      await hasuraRequest({
        query: runUpdate,
        variables: {
          id: runId,
          changes: {
            status: 'SUCCEEDED',
            finished_at: new Date().toISOString(),
            generated_count: results.length
          }
        }
      });
    }

    return res.status(200).json({
      ok: true,
      runId,
      week_start_date,
      week_end_date,
      dryRun,
      generated: results.length,
      results
    });
  } catch (err) {
    console.error('generate-weekly-briefs error', err);
    if (runId) {
      try {
    const runUpdate = `
        mutation UpdateWeeklyBriefRun($id: uuid!, $changes: weekly_brief_runs_set_input!) {
          update_weekly_brief_runs_by_pk(pk_columns: { id: $id }, _set: $changes) {
            id
          }
        }
      `;

        await hasuraRequest({
          query: runUpdate,
          variables: {
            id: runId,
            changes: {
              status: 'FAILED',
              finished_at: new Date().toISOString(),
              error: err?.message || 'Unexpected error'
            }
          }
        });
      } catch (updateError) {
        console.error('Failed to update weekly_brief_runs', updateError);
      }
    }
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Unexpected error' });
  }
};
