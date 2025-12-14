/* eslint-env node */
import {
  partnerSubmissions,
  incentiveApplications,
  incentives,
  partnerContracts,
  partnerSubmissionAudits,
  onboardingTasks,
  trainingCourses,
  trainingModules,
  courseEnrollments,
  nextId
} from './models.js';

export function seedDemoData() {
  if (partnerSubmissions.length === 0) {
    partnerSubmissions.push(
      { id: nextId('submission'), type: 'event', title: 'STEM Night', description: 'Hands-on science event', status: 'pending' },
      { id: nextId('submission'), type: 'offer', title: 'Summer tutoring', description: 'Small group sessions', status: 'approved' }
    );
  }

  if (incentives.length === 0) {
    incentives.push(
      { id: nextId('incentive'), title: 'Classroom supplies stipend', value: 500, description: 'One-time support', status: 'active' },
      { id: nextId('incentive'), title: 'After-school programming grant', value: 1200, description: 'Launch new clubs', status: 'active' }
    );
  }

  if (incentiveApplications.length === 0) {
    incentiveApplications.push(
      { id: nextId('application'), incentiveId: 1, partnerId: 'demo', status: 'pending', payout: null },
      { id: nextId('application'), incentiveId: 2, partnerId: 'demo', status: 'approved', payout: '$800' }
    );
  }

  if (partnerContracts.length === 0) {
    partnerContracts.push(
      { id: nextId('contract'), partnerId: 'demo', status: 'pending', name: 'FY25 renewal' },
      { id: nextId('contract'), partnerId: 'demo', status: 'approved', name: 'Tech integration MOU' }
    );
  }

  if (onboardingTasks.length === 0) {
    onboardingTasks.push(
      { id: nextId('task'), name: 'Verify roster import', description: 'Confirm SIS sync' },
      { id: nextId('task'), name: 'Publish welcome post', description: 'Engage parents on day 1' }
    );
  }

  if (trainingCourses.length === 0) {
    const courseId = nextId('course');
    trainingCourses.push({ id: courseId, title: 'Classroom onboarding', description: 'Get set up in Teachmo' });
    trainingModules.push(
      { id: nextId('module'), courseId, title: 'Rosters and groups', content: 'Sync students via SIS', order: 0 },
      { id: nextId('module'), courseId, title: 'Messaging basics', content: 'Connect with parents', order: 1 }
    );
    courseEnrollments.push({ id: nextId('enrollment'), courseId, partnerId: 'demo', completedModules: [trainingModules[0].id] });
  }

  if (partnerSubmissionAudits.length === 0) {
    partnerSubmissionAudits.push(
      { id: nextId('audit'), entity: 'submission', entityId: 1, action: 'approved', timestamp: new Date().toISOString() },
      { id: nextId('audit'), entity: 'incentiveApplication', entityId: 2, action: 'payout', timestamp: new Date().toISOString() }
    );
  }
}
