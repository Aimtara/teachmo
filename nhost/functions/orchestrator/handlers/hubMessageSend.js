import { fetchRecentThreadsForUser, fetchUserLabels } from '../messageHubData.js';
import { ARTIFACT_TYPES, ROUTES } from '../routes.js';

function buildRecipientOptions(threads, labelMap) {
  const seen = new Set();
  const options = [];
  for (const thread of threads) {
    for (const participant of thread.participants || []) {
      const id = participant.user_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      options.push({
        value: id,
        label: labelMap.get(id) || `User ${String(id).slice(0, 6)}`,
        description: thread.title || thread.last_message_preview || undefined
      });
    }
  }
  return options;
}

function basicDraftFromText(text = '') {
  const t = String(text || '').trim();
  if (!t) return '';
  // A tiny bit of polishing without pretending to be a full LLM.
  // Keeps parent tone: brief, respectful, cooperative.
  return t.endsWith('.') || t.endsWith('!') || t.endsWith('?') ? t : `${t}.`;
}

export async function hubMessageSendHandler(ctx) {
  const missing = [];

  // In Phase 1, we at least need a child context to avoid mis-addressing.
  // TeacherId/threadId selection can be a UI chooser later.
  if (!ctx.selected?.childId) missing.push('childId');
  if (!ctx.selected?.recipientUserId) missing.push('recipientUserId');

  if (missing.length > 0) {
    let options = [];
    if (missing.includes('recipientUserId') && ctx.actor?.userId) {
      try {
        const { threads, otherUserIds } = await fetchRecentThreadsForUser({
          userId: ctx.actor.userId,
          limit: 6
        });
        const labelMap = await fetchUserLabels({ userIds: otherUserIds });
        options = buildRecipientOptions(threads, labelMap);
      } catch (_) {
        options = [];
      }
    }

    return {
      route: ROUTES.HUB_MESSAGE_SEND,
      needs: {
        missing,
        promptUser: missing.includes('childId')
          ? {
              type: 'FOLLOWUP_QUESTION',
              actionId: 'ORCHESTRATOR_FOLLOWUP_ANSWER',
              question: 'Which child is this message about?'
            }
          : options.length > 0
            ? {
                type: 'CHOICE',
                title: 'Who should receive this message?',
                actionId: 'HUB_MESSAGE_SEND_CHOOSE_RECIPIENT',
                options
              }
            : {
                type: 'FOLLOWUP_QUESTION',
                actionId: 'ORCHESTRATOR_FOLLOWUP_ANSWER',
                question: 'Who should receive this message?'
              }
      },
      ui: {
        type: 'CARD',
        title: 'Draft message (needs context)',
        body: 'Once you pick the child, I can draft and route it to the right teacher or thread.',
        deepLink: '/hub'
      }
    };
  }

  const draft = basicDraftFromText(ctx.text || '');

  return {
    route: ROUTES.HUB_MESSAGE_SEND,
    ui: {
      type: 'CARD',
      title: 'Message draft ready',
      subtitle: 'Review, then send',
      body: draft || 'Draft is empty. Add what you want to say.',
      deepLink: `/hub?child=${encodeURIComponent(ctx.selected.childId)}`,
      primaryAction: { label: 'Open draft', action: 'OPEN_HUB_DRAFT', payload: { childId: ctx.selected.childId } },
      secondaryAction: { label: 'Edit', action: 'EDIT_DRAFT', payload: { childId: ctx.selected.childId } }
    },
    artifact: {
      type: ARTIFACT_TYPES.MESSAGE_DRAFT,
      payload: {
        childId: ctx.selected.childId,
        recipientUserId: ctx.selected.recipientUserId,
        draft,
        sourceText: ctx.text || '',
        status: 'draft'
      },
      // drafts expire in 14 days by default to avoid forever-storage.
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
    }
  };
}
