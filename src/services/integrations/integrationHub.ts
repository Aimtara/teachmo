import { GoogleClassroomEnhanced } from './googleClassroomEnhanced';
import { GoogleClassroomService } from './googleClassroom';
import { LtiProvider } from './ltiProvider';
import { SisService } from './sisService';

export const IntegrationHub = {
  sis: SisService,
  lti: LtiProvider,
  google: {
    classroom: GoogleClassroomService,
    enhanced: GoogleClassroomEnhanced
  }
};
