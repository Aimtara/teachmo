import { graphqlRequest } from '@/lib/graphql';

export async function createPartnerSubmission(input) {
  const query = `mutation CreateSubmission($input: partner_submissions_insert_input!) {
    insert_partner_submissions_one(object: $input) {
      id
      type
      title
      status
      created_at
    }
  }`;
  return graphqlRequest({ query, variables: { input } });
}

export async function listPartnerSubmissions(partnerUserId) {
  const query = `query PartnerSubmissions($partnerUserId: uuid!) {
    partner_submissions(where: { partner_user_id: { _eq: $partnerUserId } }, order_by: { created_at: desc }) {
      id
      type
      title
      status
      created_at
    }
  }`;
  const data = await graphqlRequest({ query, variables: { partnerUserId } });
  return data?.partner_submissions || [];
}
