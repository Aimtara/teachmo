import { ARTIFACT_TYPES, ROUTES } from '../routes.js';

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

  if (missing.length > 0) {
    return {
      route: ROUTES.HUB_MESSAGE_SEND,
      needs: {
        missing,
        promptUser: {
          type: 'FOLLOWUP_QUESTION',
          actionId: 'ORCHESTRATOR_FOLLOWUP_ANSWER',
          question:
            missing[0] === 'childId'
              ? 'Which child is this message about?'
              : 'I need a bit more info to send this message.'
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
        draft,
        sourceText: ctx.text || '',
        status: 'draft'
      },
      // drafts expire in 14 days by default to avoid forever-storage.
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
    }
  };
}
