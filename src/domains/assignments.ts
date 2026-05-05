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

export type AssignmentSyncRecord = {
  externalId?: string | null;
  title?: string | null;
  dueAt?: string | null;
  courseId?: string | null;
};

export type AssignmentSyncDryRunResult = {
  dryRun: true;
  status: 'ready' | 'needs_review';
  counts: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
  errors: Array<{ index: number; code: string }>;
  externalIds: string[];
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

export function buildAssignmentSyncDryRun(records: AssignmentSyncRecord[] = []): AssignmentSyncDryRunResult {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  const errors: AssignmentSyncDryRunResult['errors'] = [];
  const externalIds: string[] = [];
  const invalidIndexes = new Set<number>();

  records.forEach((record, index) => {
    const externalId = String(record.externalId ?? '').trim();
    const title = String(record.title ?? '').trim();
    const courseId = String(record.courseId ?? '').trim();

    if (!externalId) {
      errors.push({ index, code: 'missing_external_id' });
      invalidIndexes.add(index);
    }
    if (!title) {
      errors.push({ index, code: 'missing_title' });
      invalidIndexes.add(index);
    }
    if (!courseId) {
      errors.push({ index, code: 'missing_course_id' });
      invalidIndexes.add(index);
    }

    if (!externalId) return;
    if (seen.has(externalId)) {
      duplicateIds.add(externalId);
      errors.push({ index, code: 'duplicate_external_id' });
      invalidIndexes.add(index);
      return;
    }

    seen.add(externalId);
    externalIds.push(externalId);
  });

  return {
    dryRun: true,
    status: errors.length ? 'needs_review' : 'ready',
    counts: {
      total: records.length,
      valid: Math.max(0, records.length - invalidIndexes.size),
      invalid: invalidIndexes.size,
      duplicates: duplicateIds.size,
    },
    errors,
    externalIds,
  };
}
