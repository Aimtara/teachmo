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
  list: (params?: Record<string, unknown>) => apiClient.entity.list(name, params),
  filter: (params?: Record<string, unknown>) => apiClient.entity.filter(name, params),
  get: (id: string) => apiClient.entity.get(name, id),
  create: (payload: Record<string, unknown>) => apiClient.entity.create(name, payload),
  update: (id: string, payload: Record<string, unknown>) => apiClient.entity.update(name, id, payload),
  delete: (id: string) => apiClient.entity.delete(name, id)
});

const invoke = (name: string) => (payload?: AnyRecord) => apiClient.functions.invoke(name, payload);

export const orgsApi = {
  school: entity('School'),
  district: entity('District'),
  directory: entity('SchoolDirectory'),
  participationRequest: entity('SchoolParticipationRequest'),
  teacherClassAssignment: entity('TeacherClassAssignment'),
  partner: entity('Partner'),
  partnerEvent: entity('PartnerEvent'),
  partnerResource: entity('PartnerResource'),
  partnerOffer: entity('PartnerOffer'),
  searchSchools: invoke('searchSchools'),
  getSchoolIntegrationStatus: invoke('getSchoolIntegrationStatus'),
  populateSchoolDirectory: invoke('populateSchoolDirectory'),
  manageSchoolRequests: invoke('manageSchoolRequests')
};
