import { searchSchools, submitSchoolParticipationRequest } from '@/api/functions';
import { apiClient } from '../core/client';

export interface School {
  id: string;
  name: string;
  district?: string;
  status: 'active' | 'pending' | 'beta';
}

export interface SchoolSearchResult {
  id: string;
  name: string;
  district?: string;
  state?: string;
  domain?: string;
  type?: string;
  status?: 'active' | 'pending' | 'beta';
  school_id?: string;
  school_name?: string;
  district_name?: string;
  school_domain?: string;
  school_type?: string;
}

export const SchoolService = {
  async search(query: string, limit = 8): Promise<SchoolSearchResult[]> {
    if (query.length < 3) {
      return [];
    }
    const response = await searchSchools({ query, limit });
    const data = response?.data as { success?: boolean; schools?: SchoolSearchResult[] } | undefined;

    if (!data?.success) {
      return [];
    }

    return (data.schools ?? []).map((school) => {
      const id = school.id ?? school.school_id ?? '';
      const name = school.name ?? school.school_name ?? '';
      const district = school.district ?? school.district_name;
      const domain = school.domain ?? school.school_domain;
      const type = school.type ?? school.school_type;

      return {
        ...school,
        id,
        name,
        district,
        domain,
        type,
        school_id: school.school_id ?? id,
        school_name: school.school_name ?? name,
        district_name: school.district_name ?? district,
        school_domain: school.school_domain ?? domain,
        school_type: school.school_type ?? type
      };
    });
  },

  async requestSchool(schoolDetails: {
    name: string;
    zip?: string;
    contact?: string;
    domain?: string;
    notes?: string;
  }) {
    const response = await submitSchoolParticipationRequest({
      school_name: schoolDetails.name,
      school_domain: schoolDetails.domain,
      contact_email: schoolDetails.contact,
      zip: schoolDetails.zip,
      additional_notes: schoolDetails.notes
    });
    const data = response?.data as { success?: boolean; error?: string; request?: unknown } | undefined;
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to submit school request.');
    }
    return data.request;
  },

  /**
   * Checks if a school has active automated integration (SIS/LMS)
   */
  async checkIntegrationStatus(
    schoolId: string
  ): Promise<{ hasSIS: boolean; hasGoogle: boolean }> {
    return apiClient.get(`/api/schools/${schoolId}/capabilities`);
  }
};
