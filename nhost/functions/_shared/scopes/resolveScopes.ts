import { HasuraClient } from '../directory/types';

export type DataScopes = Record<string, any>;

const SYSTEM_DEFAULT_SCOPES: DataScopes = {
  directory: { email: true, names: false, externalIds: true },
  messaging: {
    enabled: true,
    sendInvites: true,
    useEmail: true,
    parentToTeacherRequests: true,
    requireApproval: true,
  },
  analytics: { enabled: false },
};

function mergeScopes(base: DataScopes, override: DataScopes): DataScopes {
  const result: DataScopes = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeScopes(result[key] || {}, value as DataScopes);
    } else {
      result[key] = value;
    }
  });
  return result;
}

export async function getEffectiveScopes(params: {
  hasura: HasuraClient;
  districtId?: string | null;
  schoolId?: string | null;
}): Promise<DataScopes> {
  const { hasura, districtId, schoolId } = params;

  const queries: string[] = [];
  const variables: Record<string, any> = {};
  if (districtId) {
    queries.push(`district: district_data_scopes(where: { district_id: { _eq: $districtId } }, limit: 1) { scopes }`);
    variables.districtId = districtId;
  }
  if (schoolId) {
    queries.push(`school: school_data_scopes(where: { school_id: { _eq: $schoolId } }, limit: 1) { scopes }`);
    variables.schoolId = schoolId;
  }

  let districtScopes: DataScopes = {};
  let schoolScopes: DataScopes = {};

  if (queries.length > 0) {
    const resp = await hasura(
      `query Scopes($districtId: uuid, $schoolId: uuid) { ${queries.join('\n')} }`,
      variables
    );

    districtScopes = resp?.data?.district?.[0]?.scopes ?? {};
    schoolScopes = resp?.data?.school?.[0]?.scopes ?? {};
  }

  return mergeScopes(mergeScopes(SYSTEM_DEFAULT_SCOPES, districtScopes), schoolScopes);
}

export function assertScope(scopes: DataScopes, path: string, requiredValue = true) {
  const parts = path.split('.');
  let current: any = scopes;
  for (const part of parts) {
    current = current?.[part];
    if (current == null) break;
  }

  if (current !== requiredValue) {
    throw new Error('scope_denied');
  }
}

export const SYSTEM_SCOPE_DEFAULTS = SYSTEM_DEFAULT_SCOPES;
