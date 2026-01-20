export default {
  async execute(ctx) {
    return {
      result: { childId: ctx.selected?.childId },
      ui: {
        type: 'CARD',
        title: 'Homework help (stub)',
        body: 'Homework assistance will be powered by the next release.',
        primaryAction: { label: 'Start homework help', action: 'OPEN_HOMEWORK' }
      }
    };
  }
};
