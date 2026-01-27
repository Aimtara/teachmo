import { buildContractResponse } from '../contract.js';

const officeHoursBook = {
  requiredContext() {
    return ['childId', 'teacherId', 'schoolId'];
  },
  execute({ ctx }) {
    return {
      childId: ctx.childId,
      teacherId: ctx.teacherId,
      status: 'ready'
    };
  },
  formatResponse({ result }) {
    return {
      response: buildContractResponse({
        summary: 'I can help you book office hours with the teacher.',
        nextStep: 'Pick a time that works for you.',
        detail: result
      }),
      ui: {
        type: 'CARD',
        title: 'Book office hours',
        primaryAction: { label: 'Choose time', action: 'OPEN_OFFICE_HOURS' },
        deepLink: '/office-hours'
      }
    };
  }
};

export default officeHoursBook;
