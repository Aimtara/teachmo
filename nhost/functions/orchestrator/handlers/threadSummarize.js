import { ARTIFACT_TYPES, ROUTES } from '../routes.js';

export async function threadSummarizeHandler(ctx) {
  const missing = [];
  if (!ctx.selected?.childId) missing.push('childId');
  // In Phase 1 we don't have thread resolution here yet.
  missing.push('threadId');

  return {
    route: ROUTES.HUB_THREAD_SUMMARIZE,
    needs: {
      missing,
      promptUser: {
        type: 'FOLLOWUP_QUESTION',
        actionId: 'ORCHESTRATOR_FOLLOWUP_ANSWER',
        question: 'Which conversation should I summarize?',
        placeholder: 'Choose a thread in the Hub (Phase 1)'
      }
    },
    ui: {
      type: 'CARD',
      title: 'Summary (stub)',
      body:
        'Thread summarization is wired through the orchestrator, but this handler is still a stub. Next: resolve threadId + fetch messages + generate a concise summary.',
      deepLink: '/hub'
    },
    artifact: {
      type: ARTIFACT_TYPES.SUMMARY,
      payload: { status: 'stub', note: 'Implement message fetch + summarizer' },
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    }
  };
}
