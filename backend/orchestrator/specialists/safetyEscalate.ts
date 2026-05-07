import { buildContractResponse } from '../contract.ts';
import type { Specialist } from './types.ts';
import { stringOrNull } from './types.ts';

const safetyEscalate: Specialist = {
  requiredContext() {
    return ['schoolId'];
  },
  execute({ input }) {
    return {
      category: stringOrNull(input.safety?.level) || 'SENSITIVE',
      status: 'review'
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'Your safety concern is important. I can connect you to the right support.',
        nextStep: 'Open safety resources and choose how to proceed.',
        detail: result
      }),
      ui: {
        type: 'CARD',
        title: 'Safety support',
        primaryAction: { label: 'View safety options', action: 'OPEN_SAFETY' },
        secondaryAction: { label: 'Contact support', action: 'CONTACT_SUPPORT' },
        deepLink: '/safety'
      }
    };
  }
};

export default safetyEscalate;
