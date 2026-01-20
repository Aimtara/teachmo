import { ARTIFACT_TYPES, ROUTES } from '../routes.js';

export async function weeklyBriefHandler(ctx) {
  const missing = [];
  if (!ctx.selected?.childId) missing.push('childId');

  if (missing.length > 0) {
    return {
      route: ROUTES.WEEKLY_BRIEF_GENERATE,
      needs: {
        missing,
        promptUser: {
          type: 'FOLLOWUP_QUESTION',
          question: 'Which child should this weekly brief cover?'
        }
      },
      ui: {
        type: 'CARD',
        title: 'Weekly brief needs a child context',
        body: 'Pick a child and I’ll generate a week-at-a-glance summary.',
        deepLink: '/dashboard'
      }
    };
  }

  // Phase 1: placeholder output (wire in your WeeklyFamilyBrief generator next)
  const payload = {
    childId: ctx.selected.childId,
    status: 'stub',
    sections: {
      shapeOfTheWeek: '—',
      highlights: [],
      watchouts: [],
      upcoming: []
    }
  };

  return {
    route: ROUTES.WEEKLY_BRIEF_GENERATE,
    ui: {
      type: 'CARD',
      title: 'Weekly brief (stub)',
      body:
        'The orchestrator can now route to Weekly Brief. Next: aggregation + load score + locked-template generation.',
      deepLink: `/dashboard?child=${encodeURIComponent(ctx.selected.childId)}`,
      primaryAction: {
        label: 'Open Dashboard',
        action: 'OPEN_DASHBOARD',
        payload: { childId: ctx.selected.childId }
      }
    },
    artifact: {
      type: ARTIFACT_TYPES.BRIEF,
      payload,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    }
  };
}
