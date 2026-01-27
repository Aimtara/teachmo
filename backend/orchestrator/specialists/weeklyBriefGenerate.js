import { buildContractResponse } from '../contract.js';

const weeklyBriefGenerate = {
  requiredContext() {
    return ['childId', 'schoolId'];
  },
  execute({ ctx }) {
    return {
      childId: ctx.childId,
      status: 'queued'
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'I can generate a weekly family brief with the key updates.',
        nextStep: 'Open the weekly brief to review highlights.',
        detail: result
      }),
      ui: {
        type: 'CARD',
        title: 'Weekly family brief',
        primaryAction: { label: 'Open brief', action: 'OPEN_WEEKLY_BRIEF' },
        deepLink: '/hub/briefs'
      }
    };
  }
};

export default weeklyBriefGenerate;
