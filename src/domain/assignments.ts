import { apiClient } from '@/services/core/client';

type AnyRecord = Record<string, unknown>;

type EntityBridge = {
  list?: (...args: unknown[]) => Promise<unknown>;
  filter?: (...args: unknown[]) => Promise<unknown>;
  get?: (...args: unknown[]) => Promise<unknown>;
  create?: (...args: unknown[]) => Promise<unknown>;
  update?: (...args: unknown[]) => Promise<unknown>;
  delete?: (...args: unknown[]) => Promise<unknown>;
};

const entity = (name: string): EntityBridge => ({
  list: (...args: unknown[]) => apiClient.entity.list(name, ...args),
  filter: (...args: unknown[]) => apiClient.entity.filter(name, ...args),
  get: (...args: unknown[]) => apiClient.entity.get(name, ...args),
  create: (...args: unknown[]) => apiClient.entity.create(name, ...args),
  update: (...args: unknown[]) => apiClient.entity.update(name, ...args),
  delete: (...args: unknown[]) => apiClient.entity.delete(name, ...args)
});

const invoke = (name: string) => (payload?: AnyRecord) => apiClient.functions.invoke(name, payload);

export const assignmentsApi = {
  assignment: entity('Assignment'),
  assignmentTopic: entity('AssignmentTopic'),
  course: entity('Course'),
  enrollment: entity('Enrollment'),
  student: entity('Student'),
  teacherClassAssignment: entity('TeacherClassAssignment'),
  googleClassroomSync: invoke('googleClassroomSync'),
  googleAuth: invoke('googleAuth'),
  getGoogleAuthUrl: invoke('getGoogleAuthUrl'),
  syncSISData: invoke('syncSISData')
};
