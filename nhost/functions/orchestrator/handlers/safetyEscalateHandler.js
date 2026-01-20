export default {
  async execute() {
    return {
      result: { action: 'safety_escalation' },
      ui: {
        type: 'CARD',
        title: 'Safety support',
        body: 'If you or a student is in immediate danger, call local emergency services. For urgent concerns, contact the school safety team right away.',
        primaryAction: { label: 'Call support', action: 'OPEN_SAFETY_RESOURCES' }
      },
      sideEffects: ['safety_escalation_prompted']
    };
  }
};
