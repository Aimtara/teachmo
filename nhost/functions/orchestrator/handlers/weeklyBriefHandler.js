export default {
  async execute(ctx) {
    return {
      result: { childId: ctx.selected?.childId },
      ui: {
        type: 'CARD',
        title: 'Weekly brief (coming soon)',
        body: 'We are wiring this route next.',
        primaryAction: { label: 'View briefs', action: 'OPEN_BRIEFS' }
      }
    };
  }
};
