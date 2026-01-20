export default {
  async execute() {
    return {
      needs: {
        missing: ['intent'],
        promptUser: {
          type: 'FOLLOWUP_QUESTION',
          title: 'How can I help?',
          placeholder: 'Tell me what you want to do next.'
        }
      },
      ui: {
        type: 'CARD',
        title: 'Tell us what you need',
        primaryAction: { label: 'Reply', action: 'OPEN_CHAT' }
      }
    };
  }
};
