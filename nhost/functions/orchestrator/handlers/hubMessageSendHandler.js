function buildDraft({ text, childId }) {
  const base = text?.trim() ? text.trim() : "Hi, I'd like to send a quick update.";
  return `${base}${childId ? `\n\nChild: ${childId}` : ''}\n\nThanks,`;
}

export default {
  async execute(ctx, input) {
    const teacherId = ctx.selected?.teacherId || ctx.entities?.teacherId;
    if (!teacherId) {
      return {
        needs: {
          missing: ['teacherId'],
          promptUser: {
            type: 'FOLLOWUP_QUESTION',
            title: 'Which teacher should I message?',
            placeholder: 'Choose a teacher'
          }
        },
        ui: {
          type: 'CARD',
          title: 'Draft absence note',
          primaryAction: { label: 'Choose teacher', action: 'OPEN_CHOOSER' }
        }
      };
    }

    const draft = buildDraft({ text: input.text, childId: ctx.selected?.childId });

    return {
      result: {
        teacherId,
        draft
      },
      artifacts: [
        {
          type: 'MESSAGE_DRAFT',
          payload: { teacherId, draft, childId: ctx.selected?.childId },
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
