import {
  Assignment,
  AssignmentTopic,
  Course,
  Enrollment,
  Student,
  TeacherClassAssignment
} from '@/API/entities';
import {
  googleClassroomSync,
  googleAuth,
  getGoogleAuthUrl,
  syncSISData
} from '@/API/functions';

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
