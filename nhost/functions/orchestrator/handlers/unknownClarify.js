import { ROUTES } from '../routes.js';

export async function unknownClarifyHandler() {
  return {
    route: ROUTES.UNKNOWN_CLARIFY,
    needs: {
      missing: [],
      promptUser: {
        type: 'FOLLOWUP_QUESTION',
        actionId: 'ORCHESTRATOR_FOLLOWUP_ANSWER',
        question: 'What would you like to do next in Teachmo?',
        placeholder: 'Try: “summarize my messages”, “book office hours”, “message the teacher”…'
      }
    },
    ui: {
      type: 'CARD',
      title: 'Quick question',
      body: 'Tell me what you want to do, and I’ll route you to the right place.'
    }
  };
}
