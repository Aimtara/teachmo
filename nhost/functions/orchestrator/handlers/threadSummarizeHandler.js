export default {
  async execute(ctx) {
    return {
      result: { threadId: ctx.selected?.threadId || null },
      ui: {
        type: 'CARD',
        title: 'Thread summary (stub)',
        body: 'Summaries will appear here once the summarizer is connected.',
        primaryAction: { label: 'Open messages', action: 'OPEN_MESSAGES' }
      }
    };
  }
};
