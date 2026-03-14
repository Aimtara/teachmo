import { createEntityBridge, createInvokeBridge } from './entityBridge';

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
