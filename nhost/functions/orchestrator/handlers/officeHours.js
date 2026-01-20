import { ROUTES } from '../routes.js';

export async function officeHoursHandler(ctx) {
  const missing = [];
  if (!ctx.selected?.childId) missing.push('childId');
  // Phase 1: the orchestrator doesn't resolve teacher slots yet.
  missing.push('teacherId');

  return {
    route: ROUTES.OFFICE_HOURS_BOOK,
    needs: {
      missing,
      promptUser: {
        type: 'FOLLOWUP_QUESTION',
        question: 'Which teacher would you like to meet with?',
        placeholder: 'Choose a teacher (Phase 1)'
      }
    },
    ui: {
      type: 'CARD',
      title: 'Book Office Hours (stub)',
      body:
        'Office Hours routing is in place. Next: resolve teacherId + query available slots + create booking.',
      deepLink: '/office-hours'
    }
  };
}
