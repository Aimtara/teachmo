import { createEntityBridge, createInvokeBridge } from './entityBridge';
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

export const orgsApi = {
  school: createEntityBridge('School'),
  district: createEntityBridge('District'),
  directory: createEntityBridge('SchoolDirectory'),
  participationRequest: createEntityBridge('SchoolParticipationRequest'),
  teacherClassAssignment: createEntityBridge('TeacherClassAssignment'),
  partner: createEntityBridge('Partner'),
  partnerEvent: createEntityBridge('PartnerEvent'),
  partnerResource: createEntityBridge('PartnerResource'),
  partnerOffer: createEntityBridge('PartnerOffer'),
  searchSchools: createInvokeBridge('searchSchools'),
  getSchoolIntegrationStatus: createInvokeBridge('getSchoolIntegrationStatus'),
  populateSchoolDirectory: createInvokeBridge('populateSchoolDirectory'),
  manageSchoolRequests: createInvokeBridge('manageSchoolRequests')
};
