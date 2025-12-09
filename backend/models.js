/* eslint-env node */
export const partnerPrograms = [];
export const trainingCourses = [];
export const trainingModules = [];
export const courseEnrollments = [];
export const onboardingTasks = [];
export const partnerTaskProgress = [];
export const incentives = [];
export const incentiveApplications = [];
export const partnerContracts = [];
export const partnerSubmissionAudits = [];
export const partnerSubmissions = [];
export const dataSubjectRequests = [];

export const families = [
  {
    id: 'family-1',
    parentId: 'parent-1',
    students: ['student-1'],
    classes: ['math-101'],
  },
  {
    id: 'family-2',
    parentId: 'parent-2',
    students: ['student-2'],
    classes: ['science-201'],
  },
];

export const students = [
  { id: 'student-1', name: 'Avery Carter', familyId: 'family-1', classId: 'math-101', progress: 0.92 },
  { id: 'student-2', name: 'Blake Nguyen', familyId: 'family-2', classId: 'science-201', progress: 0.88 },
];

export const classes = [
  { id: 'math-101', title: 'Math 101', teacherId: 'teacher-1' },
  { id: 'science-201', title: 'Science 201', teacherId: 'teacher-2' },
];

export const partnerConsents = [
  {
    partnerId: 'partner-analytics',
    familyId: 'family-1',
    scope: 'learning-outcomes',
    grantedAt: '2024-04-12T10:00:00.000Z',
    expiresAt: '2025-04-12T10:00:00.000Z',
  },
];

let counters = {
  program: 1,
  course: 1,
  module: 1,
  enrollment: 1,
  task: 1,
  progress: 1,
  incentive: 1,
  application: 1,
  contract: 1,
  audit: 1,
  submission: 1,
  dataRequest: 1,
};

export const nextId = (key) => counters[key]++;
