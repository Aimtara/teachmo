import { fetchRecentThreadsForUser, fetchUserLabels } from '../messageHubData.js';
import { ARTIFACT_TYPES, ROUTES } from '../routes.js';

function summarizeThreadLabel(thread, labelMap) {
  if (thread?.title) return String(thread.title);
  const participantLabels = (thread?.participants || [])
    .map((p) => labelMap.get(p.user_id) || '')
    .filter(Boolean);
  if (participantLabels.length > 0) return `Thread with ${participantLabels.join(', ')}`;
  return `Thread ${String(thread?.id || '').slice(0, 8)}`;
}

export async function threadSummarizeHandler(ctx) {
  const missing = [];
  if (!ctx.selected?.threadId) missing.push('threadId');

  if (missing.length > 0) {
    let options = [];
    if (ctx.actor?.userId) {
      try {
        const { threads, otherUserIds } = await fetchRecentThreadsForUser({
          userId: ctx.actor.userId,
          limit: 6
        });
        const labelMap = await fetchUserLabels({ userIds: otherUserIds });
        options = threads.map((thread) => ({
          value: thread.id,
          label: summarizeThreadLabel(thread, labelMap),
          description: thread.last_message_preview || undefined
        }));
      } catch (_) {
        options = [];
      }
    }

    return {
      route: ROUTES.HUB_THREAD_SUMMARIZE,
      needs: {
        missing,
        promptUser:
          options.length > 0
            ? {
                type: 'CHOICE',
                title: 'Which conversation should I summarize?',
                actionId: 'HUB_THREAD_SUMMARIZE_CHOOSE_THREAD',
                options
              }
            : {
                type: 'FOLLOWUP_QUESTION',
                actionId: 'ORCHESTRATOR_FOLLOWUP_ANSWER',
                question: 'Which conversation should I summarize?',
                placeholder: 'Paste a thread ID or open the Hub'
              }
      },
      ui: {
        type: 'CARD',
        title: 'Pick a thread',
        body: options.length
          ? 'Choose a recent conversation to summarize.'
          : 'Open the Hub and select a thread, or share the thread ID.',
        deepLink: '/hub'
      }
    };
  }

  return {
    route: ROUTES.HUB_THREAD_SUMMARIZE,
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
