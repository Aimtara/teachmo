import { buildContractResponse } from '../contract.ts';
import type { Specialist } from './types.ts';
import { stringOrNull } from './types.ts';

const hubMessageSend: Specialist = {
  requiredContext() {
    return ['childId', 'schoolId'];
  },
  execute({ ctx, input }) {
    return {
      draft: {
        to: stringOrNull(input.entities?.teacherId),
        childId: ctx.childId,
        tone: 'warm-brief',
        body: input.text || ''
      }
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'I can draft a message to the teacher and keep it short and clear.',
        nextStep: 'Choose the teacher and confirm the note before sending.',
        detail: result?.draft || null
      }),
      ui: {
        type: 'CARD',
        title: 'Draft absence note',
        primaryAction: { label: 'Choose teacher', action: 'OPEN_TEACHER_CHOOSER' },
        secondaryAction: { label: 'Edit draft', action: 'EDIT_DRAFT' },
        deepLink: '/hub/messages'
      }
    };
  }
};

export default hubMessageSend;
