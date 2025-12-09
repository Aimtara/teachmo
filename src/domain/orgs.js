import { base44Entities, base44Functions } from '@/api/base44';

const {
  School,
  District,
  SchoolDirectory,
  SchoolParticipationRequest,
  TeacherClassAssignment,
  Partner,
  PartnerEvent,
  PartnerResource,
  PartnerOffer
} = base44Entities;

const {
  searchSchools,
  getSchoolIntegrationStatus,
  populateSchoolDirectory,
  manageSchoolRequests
} = base44Functions;

export const orgsApi = {
  school: School,
  district: District,
  directory: SchoolDirectory,
  participationRequest: SchoolParticipationRequest,
  teacherClassAssignment: TeacherClassAssignment,
  partner: Partner,
  partnerEvent: PartnerEvent,
  partnerResource: PartnerResource,
  partnerOffer: PartnerOffer,
  searchSchools,
  getSchoolIntegrationStatus,
  populateSchoolDirectory,
  manageSchoolRequests
};
