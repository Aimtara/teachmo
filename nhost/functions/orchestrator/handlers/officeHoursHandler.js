export default {
  async execute(ctx) {
    return {
      result: { childId: ctx.selected?.childId, schoolId: ctx.selected?.schoolId },
      ui: {
        type: 'CARD',
        title: 'Office hours (stub)',
        body: 'Scheduling tools will be connected in the next milestone.',
        primaryAction: { label: 'View availability', action: 'OPEN_SCHEDULER' }
      }
    };
  }
};
