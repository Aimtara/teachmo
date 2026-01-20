import { buildContractResponse } from '../contract.js';

const unknownClarify = {
  requiredContext() {
    return ['schoolId'];
  },
  execute() {
    return {
      status: 'clarify'
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'I can help with messages, office hours, homework, or Explore.',
        nextStep: 'Pick what you want to do next.',
        detail: result
      }),
      ui: {
        type: 'CHOICE',
        title: 'What do you want to do?',
        options: [
          { label: 'Message a teacher', value: 'HUB_MESSAGE_SEND' },
          { label: 'Summarize a thread', value: 'HUB_THREAD_SUMMARIZE' },
          { label: 'Generate weekly brief', value: 'WEEKLY_BRIEF_GENERATE' },
          { label: 'Book office hours', value: 'OFFICE_HOURS_BOOK' },
          { label: 'Homework help', value: 'HOMEWORK_HELP' },
          { label: 'Find activities', value: 'EXPLORE_DEEP_LINK' }
        ]
      }
    };
  }
};

export default unknownClarify;
