import crypto from 'crypto';

export const IDENTITY_MATCH_ACTIONS = {
  MATCH: 'match',
  CREATE: 'create',
  REVIEW: 'manual_review',
};

export const IDENTITY_MATCH_REASONS = {
  EXACT_EXTERNAL_ID: 'exact_external_id',
  SCOPED_EMAIL: 'school_scoped_email',
  RELATIONSHIP_KEY: 'guardian_student_relationship_key',
  LOW_CONFIDENCE_NAME_DOB: 'low_confidence_name_dob',
  DUPLICATE_INCOMING: 'duplicate_incoming',
  NO_MATCH: 'no_existing_match',
  CONFLICT: 'conflict',
};

function norm(value) {
  return String(value ?? '').trim().toLowerCase();
}

function scoped(scope) {
  return norm(scope.schoolId) || norm(scope.districtId) || 'global';
}

function hashKey(parts) {
  return crypto.createHash('sha256').update(parts.map((part) => norm(part)).join('::')).digest('hex');
}

function same(a, b) {
  return Boolean(norm(a) && norm(a) === norm(b));
}

function rowStableId(row) {
  return row.stableId || row.personId || row.stableKey || buildStableIdentityKey(row);
}

function stableExternalKey(row) {
  return hashKey(['external', row.sourceSystem, scoped(row), row.externalId || row.sourceSystemId]);
}

function stableEmailKey(row) {
  return hashKey(['email', scoped(row), row.email]);
}

function stableRelationshipKey(row) {
  return hashKey(['relationship', scoped(row), row.guardianExternalId, row.studentExternalId]);
}

export function buildStableIdentityKey(row) {
  if (norm(row.externalId) || norm(row.sourceSystemId)) return stableExternalKey(row);
  if (norm(row.email)) return stableEmailKey(row);
  if (norm(row.guardianExternalId) && norm(row.studentExternalId)) return stableRelationshipKey(row);
  return hashKey(['manual', scoped(row), row.firstName || row.givenName, row.lastName || row.familyName, row.dateOfBirth, row.role]);
}

export function mapDirectoryIdentity(
  incoming,
  existing = [],
) {
  const stableKey = buildStableIdentityKey(incoming);
  const candidates = new Set();
  const reasons = [];

  const exactExternal = existing.filter(
    (row) =>
      (!norm(row.sourceSystem) || !norm(incoming.sourceSystem) || same(row.sourceSystem, incoming.sourceSystem)) &&
      scoped(row) === scoped(incoming) &&
      (same(row.externalId, incoming.externalId) || same(row.sourceSystemId, incoming.sourceSystemId)),
  );
  for (const row of exactExternal) candidates.add(rowStableId(row));
  if (exactExternal.length === 1) {
    return { status: 'matched', confidence: 'high', rule: 'exact_external_id', stableKey, personId: rowStableId(exactExternal[0]), candidates: [...candidates], reasons };
  }
  if (exactExternal.length > 1) reasons.push('multiple_exact_external_id_matches');

  const scopedEmail = existing.filter((row) => scoped(row) === scoped(incoming) && same(row.email, incoming.email));
  for (const row of scopedEmail) candidates.add(rowStableId(row));
  if (scopedEmail.length === 1 && candidates.size <= 1) {
    return { status: 'matched', confidence: 'high', rule: 'school_scoped_email', stableKey, personId: rowStableId(scopedEmail[0]), candidates: [...candidates], reasons };
  }
  if (scopedEmail.length > 1) reasons.push('multiple_school_scoped_email_matches');

  const relationship = existing.filter(
    (row) =>
      scoped(row) === scoped(incoming) &&
      same(row.guardianExternalId, incoming.guardianExternalId) &&
      same(row.studentExternalId, incoming.studentExternalId),
  );
  for (const row of relationship) candidates.add(rowStableId(row));
  if (relationship.length === 1 && candidates.size <= 1) {
    return { status: 'matched', confidence: 'high', rule: 'guardian_student_relationship_key', stableKey, personId: rowStableId(relationship[0]), candidates: [...candidates], reasons };
  }
  if (relationship.length > 1) reasons.push('multiple_relationship_matches');

  const lowConfidence = existing.filter(
    (row) =>
      scoped(row) === scoped(incoming) &&
      (same(row.firstName, incoming.firstName) || same(row.givenName, incoming.givenName)) &&
      (same(row.lastName, incoming.lastName) || same(row.familyName, incoming.familyName)) &&
      same(row.dateOfBirth, incoming.dateOfBirth),
  );
  for (const row of lowConfidence) candidates.add(rowStableId(row));
  if (lowConfidence.length > 0) reasons.push('name_date_match_requires_manual_review');
  if (candidates.size > 1) reasons.push('conflicting_candidate_matches');

  if (candidates.size > 0) {
    return { status: 'manual_review', confidence: 'low', rule: 'conflict_or_low_confidence', stableKey, candidates: [...candidates], reasons };
  }

  return { status: 'new', confidence: 'high', rule: 'no_existing_match', stableKey, candidates: [], reasons };
}

function toDecision(mapped) {
  if (mapped.status === 'matched') {
    return {
      action: IDENTITY_MATCH_ACTIONS.MATCH,
      reason: mapped.rule,
      stableId: mapped.personId,
      generatedStableKey: mapped.stableKey,
      candidateStableIds: mapped.candidates,
    };
  }
  if (mapped.status === 'manual_review') {
    return {
      action: IDENTITY_MATCH_ACTIONS.REVIEW,
      reason: mapped.reasons.includes('name_date_match_requires_manual_review')
        ? IDENTITY_MATCH_REASONS.LOW_CONFIDENCE_NAME_DOB
        : IDENTITY_MATCH_REASONS.CONFLICT,
      generatedStableKey: mapped.stableKey,
      candidateStableIds: mapped.candidates,
    };
  }
  return {
    action: IDENTITY_MATCH_ACTIONS.CREATE,
    reason: IDENTITY_MATCH_REASONS.NO_MATCH,
    generatedStableKey: mapped.stableKey,
    candidateStableIds: [],
  };
}

export function mapDirectoryIdentities({
  schoolId,
  districtId = null,
  existingRecords = [],
  incomingRows = [],
  allowScopedEmailMatch = false,
} = {}) {
  const decisions = [];
  const conflicts = [];
  const seen = new Map();

  for (const row of incomingRows) {
    const scopedRow = { ...row, schoolId: row.schoolId ?? schoolId, districtId: row.districtId ?? districtId };
    const key = buildStableIdentityKey(scopedRow);
    if (seen.has(key)) {
      const decision = {
        action: IDENTITY_MATCH_ACTIONS.REVIEW,
        reason: IDENTITY_MATCH_REASONS.DUPLICATE_INCOMING,
        generatedStableKey: key,
        candidateStableIds: [],
      };
      decisions.push(decision);
      conflicts.push({ key, rows: [seen.get(key), row], reason: IDENTITY_MATCH_REASONS.DUPLICATE_INCOMING });
      continue;
    }
    seen.set(key, row);

    const existingForRules = allowScopedEmailMatch
      ? existingRecords
      : existingRecords.map((record) => ({ ...record, email: null }));
    const mapped = mapDirectoryIdentity(scopedRow, existingForRules);
    decisions.push(toDecision(mapped));
    if (mapped.status === 'manual_review') {
      conflicts.push({ key, candidateStableIds: mapped.candidates, reason: decisions.at(-1).reason });
    }
  }

  return { decisions, conflicts };
}
