import { base44Entities, base44Functions } from '@/api/base44';

const {
  Assignment,
  AssignmentTopic,
  Course,
  Enrollment,
  Student,
  TeacherClassAssignment
} = base44Entities;

const { googleClassroomSync, googleAuth, getGoogleAuthUrl, syncSISData } = base44Functions;

export const assignmentsApi = {
  assignment: Assignment,
  assignmentTopic: AssignmentTopic,
  course: Course,
  enrollment: Enrollment,
  student: Student,
  teacherClassAssignment: TeacherClassAssignment,
  googleClassroomSync,
  googleAuth,
  getGoogleAuthUrl,
  syncSISData
};
