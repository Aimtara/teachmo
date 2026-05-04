import { graphqlRequest } from '@/lib/graphql';

export type SchoolParticipationRequest = {
  id: string;
  school_name: string;
  school_domain?: string | null;
  status: string;
  notes?: string | null;
  user?: {
    id: string;
    display_name?: string | null;
    email?: string | null;
  } | null;
  created_at: string;
};

type SchoolRequestsResponse = {
  school_participation_requests?: SchoolParticipationRequest[];
};

type UpdateSchoolRequestResponse = {
  update_school_participation_requests_by_pk?: Pick<SchoolParticipationRequest, 'id' | 'status'> | null;
};

export async function listSchoolParticipationRequests(status?: string): Promise<SchoolParticipationRequest[]> {
  const query = `
    query GetSchoolRequests($status: String) {
      school_participation_requests(
        where: { status: { _eq: $status } }
        order_by: { created_at: desc }
      ) {
        id
        school_name
        school_domain
        status
        notes
        user {
          id
          display_name
          email
        }
        created_at
      }
    }
  `;

  const result = await graphqlRequest<SchoolRequestsResponse, { status?: string }>({
    query,
    variables: { status },
  });

  return result?.school_participation_requests ?? [];
}

export function updateSchoolParticipationRequestStatus({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const query = `
    mutation UpdateRequest($id: uuid!, $status: String!) {
      update_school_participation_requests_by_pk(
        pk_columns: { id: $id },
        _set: { status: $status }
      ) {
        id
        status
      }
    }
  `;

  return graphqlRequest<UpdateSchoolRequestResponse, { id: string; status: string }>({
    query,
    variables: { id, status },
  });
}
