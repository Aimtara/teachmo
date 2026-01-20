import { fetchRecentThreadsForUser, fetchUserLabels } from '../messageHubData.js';

function buildDraft({ text, childId }) {
  const base = text?.trim() ? text.trim() : "Hi, I'd like to send a quick update.";
  return `${base}${childId ? `\n\nChild: ${childId}` : ''}\n\nThanks,`;
}

export default {
  async execute(ctx, input) {
    const recipientUserId = ctx.selected?.recipientUserId || ctx.selected?.teacherId || ctx.entities?.teacherId;
    if (!recipientUserId) {
      try {
        const { threads, otherUserIds } = await fetchRecentThreadsForUser({ userId: ctx.actor.userId, limit: 10 });
        const labels = await fetchUserLabels({ userIds: otherUserIds });

        const options = otherUserIds.map((id) => ({
          label: labels.get(id) || `User ${String(id).slice(0, 6)}`,
          value: id
        }));

        if (options.length > 0) {
          return {
            needs: {
              missing: ['recipientUserId'],
              promptUser: {
                type: 'CHOICE',
                title: 'Who is this message for?',
                options
              }
            },
            ui: {
              type: 'CARD',
              title: 'Choose a recipient',
              body: 'Pick who you want to message, and I’ll prepare a clean draft in the Hub.',
              deepLink: '/hub',
              primaryAction: { label: 'Open Hub', action: 'OPEN_HUB' }
            },
            result: { recentThreadsCount: threads.length }
          };
        }
      } catch (error) {
        console.warn('hub message send: unable to fetch recent threads', error);
      }

      return {
        needs: {
          missing: ['recipientUserId'],
          promptUser: {
            type: 'FOLLOWUP_QUESTION',
            title: 'Who should I send this to?',
            placeholder: 'e.g., Ms. Rivera (homeroom teacher)'
          }
        },
        ui: {
          type: 'CARD',
          title: 'Who is the recipient?',
          body: 'Open the Hub to choose the right teacher/thread, then I can drop in a ready-to-send draft.',
          deepLink: '/hub'
        }
      };
    }

    const draft = buildDraft({ text: input.text, childId: ctx.selected?.childId });

    return {
      result: {
        recipientUserId,
        draft
      },
      artifacts: [
        {
          type: 'MESSAGE_DRAFT',
          payload: { recipientUserId, draft, childId: ctx.selected?.childId },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      ui: {
        type: 'CARD',
        title: 'Message draft ready',
        body: draft,
        primaryAction: { label: 'Review & send', action: 'OPEN_DRAFT' },
        deepLink: `/hub/messages?child=${ctx.selected?.childId || ''}`
      },
      sideEffects: ['draft_saved']
    };
  }
};
