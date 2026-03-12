import { base44Entities, base44Functions } from '@/api/base44';

type AnyRecord = Record<string, unknown>;

const entities = base44Entities as AnyRecord;
const functions = base44Functions as AnyRecord;

export const orgsApi = {
  school: entities.School,
  district: entities.District,
  directory: entities.SchoolDirectory,
  participationRequest: entities.SchoolParticipationRequest,
  teacherClassAssignment: entities.TeacherClassAssignment,
  partner: entities.Partner,
  partnerEvent: entities.PartnerEvent,
  partnerResource: entities.PartnerResource,
  partnerOffer: entities.PartnerOffer,
  searchSchools: functions.searchSchools,
  getSchoolIntegrationStatus: functions.getSchoolIntegrationStatus,
  populateSchoolDirectory: functions.populateSchoolDirectory,
  manageSchoolRequests: functions.manageSchoolRequests
};
