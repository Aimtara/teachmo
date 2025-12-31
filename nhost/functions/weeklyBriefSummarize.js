/* eslint-env node */
import { summarizeWeeklyInputs } from './lib/weeklyBrief.js';

// Nhost function: weeklyBriefSummarize
// Normalizes week-ahead inputs (events, announcements, messages, child context, scenarios)
// into a stable schema that the Weekly Family Brief generator can consume.

export default async (req, res) => {
  try {
    const payload = req.body || {};
    const summary = summarizeWeeklyInputs(payload);

    if (!summary.week_start || !summary.week_end) {
      return res.status(400).json({
        success: false,
        error: 'week_start and week_end are required'
      });
    }

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('weeklyBriefSummarize error', error);
    return res.status(500).json({ success: false, error: 'Failed to summarize weekly inputs' });
  }
};
