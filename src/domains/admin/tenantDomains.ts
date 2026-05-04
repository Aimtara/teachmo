import { graphqlRequest } from '@/lib/graphql';

export type TenantDomain = {
  id: string;
  domain: string;
  is_primary?: boolean | null;
  verified_at?: string | null;
};

type TenantDomainsResponse = {
  tenant_domains?: TenantDomain[];
};

export async function listTenantDomains(organizationId: string): Promise<TenantDomain[]> {
  const query = `query TenantDomains($organizationId: uuid!) {
    tenant_domains(where: { organization_id: { _eq: $organizationId } }, order_by: { domain: asc }) {
      id
      domain
      is_primary
      verified_at
    }
  }`;

  const data = await graphqlRequest<TenantDomainsResponse>({
    query,
    variables: { organizationId },
  });

  return data?.tenant_domains ?? [];
}

export async function addTenantDomain({
  organizationId,
  domain,
}: {
  organizationId: string;
  domain: string;
}) {
  const mutation = `mutation AddTenantDomain($object: tenant_domains_insert_input!) {
    insert_tenant_domains_one(object: $object) { id }
  }`;

  return graphqlRequest({
    query: mutation,
    variables: {
      object: {
        organization_id: organizationId,
        domain: domain.trim().toLowerCase(),
        is_primary: false,
      },
    },
  });
}

export async function setPrimaryTenantDomain({
  organizationId,
  id,
}: {
  organizationId: string | null;
  id: string;
}) {
  const mutation = `mutation SetPrimaryDomain($organizationId: uuid!, $id: uuid!) {
    update_tenant_domains(where: { organization_id: { _eq: $organizationId } }, _set: { is_primary: false }) {
      affected_rows
    }
    update_tenant_domains_by_pk(pk_columns: { id: $id }, _set: { is_primary: true }) { id }
  }`;

  return graphqlRequest({ query: mutation, variables: { organizationId, id } });
}

export async function removeTenantDomain(id: string) {
  const mutation = `mutation RemoveTenantDomain($id: uuid!) {
    delete_tenant_domains_by_pk(id: $id) { id }
  }`;

  return graphqlRequest({ query: mutation, variables: { id } });
}
