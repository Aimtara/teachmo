/* eslint-env node */

import { hasuraRequest } from './lib/hasura.js';
import { assertAdminRole } from './lib/roles.js';
import type { WeeklyBriefRunsResponse } from './_shared/weeklyBriefTypes';

/**
 * weekly-brief-runs-get
 *
 * Returns recent generation runs for Weekly Briefs.
 *
 * POST body: { weekStart?: 'YYYY-MM-DD', limit?: number }
 */
export default async (req: any, res: any) => {
  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    assertAdminRole(req);

    const { weekStart, limit = 10 } = req.body || {};
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));

    const args = [];
    if (weekStart) {
      args.push('where: { week_start_date: { _eq: $weekStart } }');
    }
    args.push('order_by: { started_at: desc }');
    args.push('limit: $limit');

    const query = `
      query WeeklyBriefRuns($limit: Int!, $weekStart: date) {
        weekly_brief_runs(${args.join(', ')}) {
          id
          organization_id
          school_id
          week_start_date
          week_end_date
          trigger
          dry_run
          status
          started_at
          finished_at
          generated_count
          error
          created_by_user_id
          created_by_role
          metadata
        }
      }
    `;

    const data = (await hasuraRequest({
      query,
      variables: {
        limit: safeLimit,
        weekStart: weekStart || null
      }
    })) as WeeklyBriefRunsResponse;

    return res.status(200).json({ ok: true, runs: data?.weekly_brief_runs ?? [] });
  } catch (err) {
    console.error('weekly-brief-runs-get error', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Unexpected error' });
  }
};
