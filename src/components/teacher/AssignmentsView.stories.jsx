import AssignmentsView from './AssignmentsView';

const dueSoon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

export default {
  title: 'Launch flows/Assignments',
  component: AssignmentsView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Teacher assignment list, creation entry point, and Google Classroom sync controls for visual regression.',
      },
    },
  },
};

export const PopulatedClass = {
  args: {
    currentUser: { id: 'teacher-1', name: 'Ms. Carter' },
    classData: {
      studentCount: 24,
      course: {
        id: 'course-1',
        name: '5th Grade Science',
      },
    },
  },
  parameters: {
    mockData: {
      assignments: [
        {
          id: 'assignment-1',
          title: 'Moon phases observation journal',
          description: 'Students record nightly observations and add one reflection paragraph.',
          due_at: dueSoon,
          submission_count: 18,
        },
        {
          id: 'assignment-2',
          title: 'Ecosystem vocabulary check',
          description: 'Short formative assessment before the lab rotation.',
          due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          submission_count: 9,
        },
      ],
    },
  },
};

export const EmptyClass = {
  args: {
    currentUser: { id: 'teacher-2', name: 'Mr. Singh' },
    classData: {
      studentCount: 0,
      course: {
        id: 'course-empty',
        name: 'Advisory',
      },
    },
  },
};
