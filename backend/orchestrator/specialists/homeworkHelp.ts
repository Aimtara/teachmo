import { buildContractResponse } from '../contract.ts';
import type { Specialist } from './types.ts';
import { stringOrNull } from './types.ts';

const homeworkHelp: Specialist = {
  requiredContext() {
    return ['childId', 'schoolId'];
  },
  execute({ ctx, input }) {
    return {
      childId: ctx.childId,
      topic: stringOrNull(input.entities?.topic),
      status: 'ready'
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'I can break the homework into parent-friendly steps.',
        nextStep: 'Open the homework coach.',
        detail: result
      }),
      ui: {
        type: 'CARD',
        title: 'Homework coach',
        primaryAction: { label: 'Start homework help', action: 'OPEN_HOMEWORK_COACH' },
        deepLink: '/homework'
      }
    };
  }
};

export default homeworkHelp;
