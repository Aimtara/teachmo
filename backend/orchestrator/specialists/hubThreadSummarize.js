import { buildContractResponse } from '../contract.js';

const hubThreadSummarize = {
  requiredContext() {
    return ['threadId', 'schoolId'];
  },
  execute({ ctx }) {
    return {
      threadId: ctx.threadId || null,
      status: 'ready'
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'I can summarize the latest thread so you can catch up fast.',
        nextStep: 'Open the thread summary.',
        detail: result
      }),
      ui: {
        type: 'CARD',
        title: 'Thread summary',
        primaryAction: { label: 'View summary', action: 'OPEN_THREAD_SUMMARY' },
        deepLink: '/hub/messages'
      }
    };
  }
};

export default hubThreadSummarize;
