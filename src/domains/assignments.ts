import { graphqlRequest } from '@/lib/graphql';

export type AssignmentRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  due_at?: string | null;
  submission_count?: number | null;
  submissionCount?: number | null;
  created_at?: string | null;
};

export type CreateAssignmentInput = {
  course_id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  status: 'active' | string;
  teacher_user_id: string;
};

const ASSIGNMENT_FIELDS = `
  id
  title
  description
  due_at
  submission_count
  created_at
`;

export async function listAssignmentsByCourse(courseId: string): Promise<AssignmentRecord[]> {
  const query = `
    query AssignmentsByCourse($courseId: String!) {
      assignments(
        where: { course_id: { _eq: $courseId } }
        order_by: [{ due_at: asc_nulls_last }, { created_at: desc }]
      ) {
        ${ASSIGNMENT_FIELDS}
      }
    }
  `;
  const result = await graphqlRequest<{ assignments?: AssignmentRecord[] }>({
    query,
    variables: { courseId: String(courseId) },
  });
  return Array.isArray(result?.assignments) ? result.assignments : [];
}

export async function createAssignment(input: CreateAssignmentInput): Promise<AssignmentRecord | null> {
  const mutation = `
    mutation CreateAssignment($object: assignments_insert_input!) {
      insert_assignments_one(object: $object) {
        ${ASSIGNMENT_FIELDS}
      }
    }
  `;
  const result = await graphqlRequest<{ insert_assignments_one?: AssignmentRecord | null }>({
    query: mutation,
    variables: { object: input },
  });
  return result?.insert_assignments_one ?? null;
}
