import { z } from 'zod';
import {
  searchSchools,
  submitSchoolParticipationRequest,
  type SchoolRequestData,
  type SearchSchoolsData,
} from '@/api/functions';
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

const schoolRecordSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  domain: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['active', 'pending', 'beta']).optional(),
  school_id: z.string().optional(),
  school_name: z.string().optional(),
  district_name: z.string().optional(),
  school_domain: z.string().optional(),
  school_type: z.string().optional(),
});

const searchSchoolsDataSchema: z.ZodType<SearchSchoolsData> = z.object({
  success: z.boolean().optional(),
  schools: z.array(schoolRecordSchema).optional(),
  error: z.string().optional(),
});

const schoolRequestDataSchema: z.ZodType<SchoolRequestData> = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  request: z.unknown().optional(),
});

const schoolCapabilitiesSchema = z.object({
  hasSIS: z.boolean().optional(),
  hasGoogle: z.boolean().optional(),
}).passthrough();

function parseSearchSchoolsData(value: unknown): SearchSchoolsData {
  const parsed = searchSchoolsDataSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function parseSchoolRequestData(value: unknown): SchoolRequestData {
  const parsed = schoolRequestDataSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export const SchoolService = {
  async search(query: string, limit = 8): Promise<SchoolSearchResult[]> {
    if (query.length < 3) {
      return [];
    }

    const response = await searchSchools({ query, limit });
    const data = parseSearchSchoolsData(response?.data);

    if (!data.success) {
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
        school_type: school.school_type ?? type,
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
      additional_notes: schoolDetails.notes,
    });
    const data = parseSchoolRequestData(response?.data);

    if (!data.success) {
      throw new Error(data.error || 'Failed to submit school request.');
    }
    return data.request;
  },

  /**
   * Checks if a school has active automated integration (SIS/LMS)
   */
  async checkIntegrationStatus(
    schoolId: string
  ): Promise<{ hasSIS: boolean; hasGoogle: boolean }> {
    const raw = await apiClient.get(`/api/schools/${schoolId}/capabilities`);

    const parsed = schoolCapabilitiesSchema.safeParse(raw);
    const data = parsed.success ? parsed.data : {};

    const hasSIS = Boolean(data.hasSIS);
    const hasGoogle = Boolean(data.hasGoogle);

    return {
      hasSIS,
      hasGoogle,
    };
  },
};
