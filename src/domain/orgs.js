import {
  School,
  District,
  SchoolDirectory,
  SchoolParticipationRequest,
  TeacherClassAssignment,
  Partner,
  PartnerEvent,
  PartnerResource,
  PartnerOffer
} from '@/API/entities';
import {
  searchSchools,
  getSchoolIntegrationStatus,
  populateSchoolDirectory,
  manageSchoolRequests
} from '@/API/functions';

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
