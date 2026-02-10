import { graphqlRequest } from '@/lib/graphql';

export async function createPartnerSubmission(input) {
  const query = `mutation CreateSubmission($input: public_partner_submissions_insert_input!) {
    insert_public_partner_submissions_one(object: $input) {
      id
      type
      title
      status
      created_at
    }
  }`;
  const data = await graphqlRequest({ query, variables: { input } });
  return data?.insert_public_partner_submissions_one ?? null;
}

export async function listPartnerSubmissions(partnerUserId) {
  const query = `query PartnerSubmissions($partnerUserId: uuid!) {
    public_partner_submissions(where: { partner_user_id: { _eq: $partnerUserId } }, order_by: { created_at: desc }) {
      id
      type
      title
      status
      created_at
    }
  }`;
  const data = await graphqlRequest({ query, variables: { partnerUserId } });
  return data?.public_partner_submissions || [];
}
