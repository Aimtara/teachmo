import { graphqlRequest } from '@/lib/graphql';

export async function createPartnerSubmission(input) {
  const query = `mutation CreateSubmission($input: partner_submissions_insert_input!) {
    insert_partner_submissions_one(object: $input) {
      id
      title
      status
      created_at
    }
  }`;
  return graphqlRequest({ query, variables: { input } });
}

export async function listPartnerSubmissions(partnerId) {
  const query = `query PartnerSubmissions($partnerId: uuid!) {
    partner_submissions(where: { partner_id: { _eq: $partnerId } }, order_by: { created_at: desc }) {
      id
      title
      status
      created_at
    }
  }`;
  const data = await graphqlRequest({ query, variables: { partnerId } });
  return data?.partner_submissions || [];
}
