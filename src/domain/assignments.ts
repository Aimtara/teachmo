import { createEntityBridge, createInvokeBridge } from './entityBridge';

export const assignmentsApi = {
  assignment: createEntityBridge('Assignment'),
  assignmentTopic: createEntityBridge('AssignmentTopic'),
  course: createEntityBridge('Course'),
  enrollment: createEntityBridge('Enrollment'),
  student: createEntityBridge('Student'),
  teacherClassAssignment: createEntityBridge('TeacherClassAssignment'),
  googleClassroomSync: createInvokeBridge('googleClassroomSync'),
  googleAuth: createInvokeBridge('googleAuth'),
  getGoogleAuthUrl: createInvokeBridge('getGoogleAuthUrl'),
  syncSISData: createInvokeBridge('syncSISData')
};
