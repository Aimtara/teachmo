import { base44Entities, base44Functions } from '@/api/base44';

type AnyRecord = Record<string, unknown>;

const entities = base44Entities as AnyRecord;
const functions = base44Functions as AnyRecord;

export const assignmentsApi = {
  assignment: entities.Assignment,
  assignmentTopic: entities.AssignmentTopic,
  course: entities.Course,
  enrollment: entities.Enrollment,
  student: entities.Student,
  teacherClassAssignment: entities.TeacherClassAssignment,
  googleClassroomSync: functions.googleClassroomSync,
  googleAuth: functions.googleAuth,
  getGoogleAuthUrl: functions.getGoogleAuthUrl,
  syncSISData: functions.syncSISData
};
