/* eslint-env node */

import { hasuraRequest } from './lib/hasura.js';
import {
  summarizeWeeklyInputs,
  determineUxState,
  generateBriefWithLLM,
  renderBriefHtml,
  renderBriefText
} from './lib/weeklyBrief';
import { formatWeekRange, toISODate } from './lib/weekRange';
import { notifyUserEvent } from './_shared/notifier';
import { createHasuraClient } from './_shared/hasuraClient';
import type { WeeklyBriefHistoryResponse, WeeklyBriefUpsertResponse } from './_shared/weeklyBriefTypes';

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async (req: any, res: any) => {
  try {
    const payload = req.body || {};

    const parentUserId = payload.parent_user_id || payload.parentUserId;
    const childId = payload.child_id || payload.childId;

    const weekStart = parseDate(payload.week_start || payload.weekStart);
    const weekEnd = parseDate(payload.week_end || payload.weekEnd);

    if (!parentUserId || !childId) {
      return res.status(400).json({ success: false, error: 'parent_user_id and child_id are required' });
    }
    if (!weekStart || !weekEnd) {
      return res.status(400).json({ success: false, error: 'week_start and week_end are required (ISO date/datetime)' });
    }

    const weekRange = payload.week_range || payload.weekRange || formatWeekRange({ weekStart, weekEnd });

    const summary = payload.summarized_inputs
      ? payload.summarized_inputs
      : summarizeWeeklyInputs({ ...payload, week_start: payload.week_start || toISODate(weekStart), week_end: payload.week_end || toISODate(weekEnd) });

    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    const { draft, used_fallback, fallback_reason } = await generateBriefWithLLM({
      weekRange,
      uxState,
      summary
    });

    const content_html = renderBriefHtml({ weekRange, draft });
    const content_text = renderBriefText({ weekRange, draft });

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

    const object = {
      parent_user_id: parentUserId,
      child_id: childId,
      week_start: toISODate(weekStart),
      week_end: toISODate(weekEnd),
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

    const saved = (await hasuraRequest({ query: mutation, variables: { object } })) as WeeklyBriefUpsertResponse;
    const sendNotification = payload.notify !== false;
    if (sendNotification && saved?.insert_weekly_briefs_one?.id) {
      const hasura = await createHasuraClient();
      await notifyUserEvent({
        hasura,
        userId: parentUserId,
        type: 'weekly_brief_ready',
        title: 'Your weekly brief is ready',
        body: `Your weekly brief for ${weekRange} is ready to view.`,
        metadata: {
          week_start: toISODate(weekStart),
          week_end: toISODate(weekEnd),
          child_id: childId,
          brief_id: saved.insert_weekly_briefs_one.id
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: saved?.insert_weekly_briefs_one?.id,
        ux_state: saved?.insert_weekly_briefs_one?.ux_state,
        generated_at: saved?.insert_weekly_briefs_one?.generated_at,
        week_range: weekRange,
        shape_of_the_week: draft.shape_of_the_week,
        school_things_to_know: draft.school_things_to_know || [],
        content_html,
        content_text,
        used_fallback: !!used_fallback
      }
    });
  } catch (error) {
    console.error('weeklyBriefGenerate error', error);
    return res.status(500).json({ success: false, error: 'Failed to generate weekly brief' });
  }
};
