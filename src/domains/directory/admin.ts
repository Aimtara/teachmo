import { graphqlRequest } from '@/lib/graphql';

export type SchoolDirectoryEntry = {
  id: string;
  name: string;
  nces_id?: string | null;
  city?: string | null;
  state?: string | null;
  integration_enabled?: boolean | null;
  created_at?: string | null;
};

type SchoolDirectoryResponse = {
  school_directory?: SchoolDirectoryEntry[];
};

type UpdateSchoolIntegrationResponse = {
  update_school_directory_by_pk?: Pick<SchoolDirectoryEntry, 'id' | 'integration_enabled'> | null;
};

type SchoolDirectoryVariables = {
  search: string;
};

type UpdateSchoolIntegrationVariables = {
  id: string;
  integration_enabled: boolean;
};

export async function listSchoolDirectoryEntries(search: string): Promise<SchoolDirectoryEntry[]> {
  const query = `
    query GetSchoolDirectory($search: String) {
      school_directory(
        where: { name: { _ilike: $search } }
        order_by: { name: asc }
        limit: 50
      ) {
        id
        name
        nces_id
        city
        state
        integration_enabled
        created_at
      }
    }
  `;

  const result = await graphqlRequest<SchoolDirectoryResponse, SchoolDirectoryVariables>({
    query,
    variables: { search: `%${search}%` },
  });

  return Array.isArray(result?.school_directory) ? result.school_directory : [];
}

export async function updateSchoolDirectoryIntegrationEnabled({
  id,
  integrationEnabled,
}: {
  id: string;
  integrationEnabled: boolean;
}) {
  const mutation = `
    mutation UpdateSchool($id: uuid!, $integration_enabled: Boolean!) {
      update_school_directory_by_pk(
        pk_columns: { id: $id },
        _set: { integration_enabled: $integration_enabled }
      ) {
        id
        integration_enabled
      }
    }
  `;

  const result = await graphqlRequest<UpdateSchoolIntegrationResponse, UpdateSchoolIntegrationVariables>({
    query: mutation,
    variables: { id, integration_enabled: integrationEnabled },
  });

  return result?.update_school_directory_by_pk ?? null;
}
