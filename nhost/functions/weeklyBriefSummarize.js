/* eslint-env node */
import { summarizeWeeklyInputs } from './lib/weeklyBrief.js';

// Nhost serverless function: weeklyBriefSummarize
// Purpose: normalize and summarize week-ahead inputs for Weekly Family Brief.
//
// Expected payload (flexible):
// {
//   week_start|weekStart: string (ISO date or datetime)
//   week_end|weekEnd: string (ISO date or datetime)
//   child: {...} or child_id
//   school_events|schoolEvents: [...] (optional)
//   announcements: [...] (optional)
//   messages: [...] (optional)
//   family_anchors|familyAnchors: {...} (optional)
//   scenario_pool|scenarios: [...] (optional)
// }

export default async (req, res) => {
  try {
    const payload = req.body || {};
    const summary = summarizeWeeklyInputs(payload);

    // Minimal validation: week bounds should exist (caller should supply).
    if (!summary.week_start || !summary.week_end) {
      return res.status(400).json({
        success: false,
        error: 'week_start and week_end are required'
      });
    }

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('weeklyBriefSummarize error', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to summarize weekly inputs'
    });
  }
};
