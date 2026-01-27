import { graphql } from '@/lib/graphql';
import { mergeScopes, resolveEffectiveScopes, SYSTEM_SCOPE_DEFAULTS, type DataScopes } from '@/utils/scopes';

type FetchParams = {
  districtId: string;
  schoolId?: string | null;
};

export async function fetchDataScopes({ districtId, schoolId }: FetchParams) {
  const data = await graphql(
    `query DataScopes($districtId: uuid!, $schoolId: uuid) {
      district: district_data_scopes(where: { district_id: { _eq: $districtId } }, limit: 1) { scopes }
      school: school_data_scopes(where: { school_id: { _eq: $schoolId } }, limit: 1) { scopes }
    }`,
    { districtId, schoolId: schoolId || null }
  );

  const districtScopes = data?.district?.[0]?.scopes ?? {};
  const schoolScopes = data?.school?.[0]?.scopes ?? {};
  const effectiveScopes = resolveEffectiveScopes({ districtScopes, schoolScopes });

  return {
    districtScopes: mergeScopes(SYSTEM_SCOPE_DEFAULTS, districtScopes),
    schoolScopes: Object.keys(schoolScopes).length ? mergeScopes(SYSTEM_SCOPE_DEFAULTS, schoolScopes) : null,
    effectiveScopes
  };
}

export async function saveDistrictScopes(districtId: string, scopes: DataScopes) {
  return graphql(
    `mutation UpsertDistrictScopes($districtId: uuid!, $scopes: jsonb!) {
      insert_district_data_scopes_one(
        object: { district_id: $districtId, scopes: $scopes },
        on_conflict: { constraint: district_data_scopes_district_id_key, update_columns: [scopes] }
      ) { id }
    }`,
    { districtId, scopes }
  );
}

export async function saveSchoolScopes(schoolId: string, districtId: string, scopes: DataScopes) {
  return graphql(
    `mutation UpsertSchoolScopes($schoolId: uuid!, $districtId: uuid!, $scopes: jsonb!) {
      insert_school_data_scopes_one(
        object: { school_id: $schoolId, district_id: $districtId, scopes: $scopes },
        on_conflict: { constraint: school_data_scopes_school_id_key, update_columns: [scopes, district_id] }
      ) { id }
    }`,
    { schoolId, districtId, scopes }
  );
}
