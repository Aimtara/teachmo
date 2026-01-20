import { ROUTES } from '../routes.js';

export async function homeworkHelpHandler(ctx) {
  const missing = [];
  if (!ctx.selected?.childId) missing.push('childId');

  return {
    route: ROUTES.HOMEWORK_HELP,
    needs:
      ctx.text && ctx.text.trim().length > 0
        ? undefined
        : {
            missing: ['assignmentDetails'],
            promptUser: {
              type: 'FOLLOWUP_QUESTION',
              question: 'What assignment do you want help with?',
              placeholder: 'Paste the prompt or describe the homework'
            }
          },
    ui: {
      type: 'CARD',
      title: 'Homework help (stub)',
      body:
        'Homework routing is in place. Next: parse assignment + provide step-by-step parent coaching with guardrails.',
      deepLink: '/homework'
    }
  };
}
