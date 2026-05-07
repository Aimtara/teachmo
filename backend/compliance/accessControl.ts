/* eslint-env node */

export const RELATIONSHIP_STATES = Object.freeze([
  'unverified',
  'invited',
  'school_verified',
  'guardian_confirmed',
  'revoked',
  'disputed',
]);

const VERIFIED_GUARDIAN_STATES = new Set(['school_verified', 'guardian_confirmed']);
const ADMIN_ROLES = new Set(['system_admin', 'district_admin', 'school_admin', 'admin']);
const SCHOOL_ROLES = new Set(['teacher', 'school_admin']);
const GUARDIAN_ROLES = new Set(['parent', 'guardian']);

type SubjectRecord = Record<string, unknown>;
type ActorRecord = Record<string, unknown>;

interface AccessContext extends Record<string, unknown> {
  tenantId?: unknown;
  organizationId?: unknown;
  districtId?: unknown;
  schoolId?: unknown;
  school_id?: unknown;
  relationship?: SubjectRecord | null;
  relationships?: SubjectRecord[];
}

interface RelationshipCheckOptions {
  actorId?: unknown;
  studentId?: unknown;
  schoolId?: unknown;
  tenantId?: unknown;
}

interface AccessDecision {
  allowed: boolean;
  reason: string;
}

export class AccessDeniedError extends Error {
  reason: string;
  metadata: Record<string, unknown>;
  statusCode: number;

  constructor(reason: string, metadata: Record<string, unknown> = {}) {
    super(reason);
    this.name = 'AccessDeniedError';
    this.reason = reason;
    this.metadata = metadata;
    this.statusCode = 403;
  }
}

function asArray(value: unknown): unknown[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function idEquals(left: unknown, right: unknown): boolean {
  return left !== undefined && left !== null && right !== undefined && right !== null && String(left) === String(right);
}

function tenantIdOf(subject: SubjectRecord = {}): unknown {
  return subject.tenantId || subject.organizationId || subject.districtId || null;
}

function actorRole(actor: ActorRecord = {}): string {
  return String(actor.role || '').toLowerCase();
}

function sameTenant(actor: ActorRecord, subject: SubjectRecord, context: AccessContext = {}): boolean {
  const actorTenant = tenantIdOf(actor) || tenantIdOf(context);
  const subjectTenant = tenantIdOf(subject) || tenantIdOf(context);
  return Boolean(actorTenant && subjectTenant && idEquals(actorTenant, subjectTenant));
}

function sameSchool(actor: ActorRecord, student: SubjectRecord): boolean {
  const actorSchools = new Set([
    actor?.schoolId,
    ...(asArray(actor.schoolIds)),
  ].filter(Boolean).map(String));
  const studentSchools = new Set([
    student?.schoolId,
    ...(asArray(student.schoolIds)),
  ].filter(Boolean).map(String));
  if (!actorSchools.size || !studentSchools.size) return false;
  return Array.from(studentSchools).some((schoolId) => actorSchools.has(schoolId));
}

function sharesClass(actor: ActorRecord, student: SubjectRecord): boolean {
  const actorClasses = new Set(asArray(actor.classIds).map(String));
  const studentClasses = new Set(asArray(student.classIds).map(String));
  if (!actorClasses.size || !studentClasses.size) return false;
  return Array.from(studentClasses).some((classId) => actorClasses.has(classId));
}

export function isVerifiedGuardianRelationship(
  relationship: SubjectRecord | null | undefined,
  { actorId, studentId, schoolId, tenantId }: RelationshipCheckOptions = {}
): boolean {
  if (!relationship) return false;
  if (!VERIFIED_GUARDIAN_STATES.has(String(relationship.state))) return false;
  if (actorId && !idEquals(relationship.guardianId || relationship.actorId, actorId)) return false;
  if (studentId && !idEquals(relationship.studentId || relationship.childId, studentId)) return false;
  if (schoolId && relationship.schoolId && !idEquals(relationship.schoolId, schoolId)) return false;
  if (tenantId && tenantIdOf(relationship) && !idEquals(tenantIdOf(relationship), tenantId)) return false;
  return true;
}

export function canAccessStudentData(actor: ActorRecord, student: SubjectRecord, context: AccessContext = {}): AccessDecision {
  if (!actor?.id && !actor?.userId) return { allowed: false, reason: 'missing_actor' };
  if (!student?.id && !student?.studentId && !student?.childId) return { allowed: false, reason: 'missing_student' };
  if (!sameTenant(actor, student, context)) return { allowed: false, reason: 'tenant_scope_required' };

  const role = actorRole(actor);
  const actorId = actor.id || actor.userId;
  const studentId = student.id || student.studentId || student.childId;
  const tenantId = tenantIdOf(student) || tenantIdOf(context);

  if (GUARDIAN_ROLES.has(role)) {
    const relationship = context.relationship || (context.relationships ?? []).find((candidate) =>
      isVerifiedGuardianRelationship(candidate, { actorId, studentId, tenantId }),
    );
    if (!isVerifiedGuardianRelationship(relationship, { actorId, studentId, tenantId })) {
      return { allowed: false, reason: 'verified_guardian_relationship_required' };
    }
    return { allowed: true, reason: 'verified_guardian_relationship' };
  }

  if (role === 'teacher') {
    if (!sameSchool(actor, student)) return { allowed: false, reason: 'teacher_school_scope_required' };
    if (!sharesClass(actor, student)) return { allowed: false, reason: 'teacher_class_scope_required' };
    return { allowed: true, reason: 'teacher_class_scope' };
  }

  if (role === 'school_admin' || role === 'admin') {
    if (!sameSchool(actor, student)) return { allowed: false, reason: 'school_admin_scope_required' };
    return { allowed: true, reason: 'school_admin_school_scope' };
  }

  if (role === 'district_admin') {
    return { allowed: true, reason: 'district_admin_tenant_scope' };
  }

  if (role === 'system_admin') {
    return { allowed: true, reason: 'system_admin_tenant_scope' };
  }

  return { allowed: false, reason: 'role_not_authorized' };
}

export function requireVerifiedGuardianRelationship(
  actorId: unknown,
  studentId: unknown,
  context: AccessContext = {}
): SubjectRecord {
  const tenantId = context.tenantId || context.organizationId || context.districtId;
  const relationship = context.relationship || (context.relationships ?? []).find((candidate) =>
    isVerifiedGuardianRelationship(candidate, { actorId, studentId, tenantId }),
  );
  if (!isVerifiedGuardianRelationship(relationship, { actorId, studentId, tenantId })) {
    throw new AccessDeniedError('verified_guardian_relationship_required', { actorId, studentId });
  }
  return relationship as SubjectRecord;
}

export function requireSchoolAuthorizedRelationship(
  actorId: unknown,
  studentId: unknown,
  schoolId: unknown,
  context: AccessContext = {}
): SubjectRecord {
  const relationship = requireVerifiedGuardianRelationship(actorId, studentId, { ...context, schoolId });
  if (relationship.schoolId && !idEquals(relationship.schoolId, schoolId)) {
    throw new AccessDeniedError('school_authorized_relationship_required', { actorId, studentId, schoolId });
  }
  return relationship;
}

export function requireRole(actor: ActorRecord, allowedRoles: unknown): true {
  const allowed = new Set(asArray(allowedRoles).map((role) => String(role).toLowerCase()));
  if (!allowed.has(actorRole(actor))) throw new AccessDeniedError('role_required', { allowedRoles: [...allowed] });
  return true;
}

export function requireTenant(actor: ActorRecord, tenantId: unknown): true {
  if (!tenantId || !idEquals(tenantIdOf(actor), tenantId)) throw new AccessDeniedError('tenant_scope_required', { tenantId });
  return true;
}

export function requireSchoolScope(actor: ActorRecord, schoolId: unknown): true {
  if (!schoolId || !sameSchool(actor, { schoolId })) throw new AccessDeniedError('school_scope_required', { schoolId });
  return true;
}

export function requireClassScope(actor: ActorRecord, classId: unknown): true {
  if (!classId || !asArray(actor.classIds).map(String).includes(String(classId))) {
    throw new AccessDeniedError('class_scope_required', { classId });
  }
  return true;
}

export function requireStudentScope(actor: ActorRecord, student: SubjectRecord, context: AccessContext = {}): true {
  const decision = canAccessStudentData(actor, student, context);
  if (!decision.allowed) throw new AccessDeniedError(decision.reason, { studentId: student?.id || student?.studentId });
  return true;
}

export function requireAdminScope(actor: ActorRecord, action: unknown, context: AccessContext = {}): true {
  if (!ADMIN_ROLES.has(actorRole(actor))) throw new AccessDeniedError('admin_role_required', { action });
  if (context.tenantId || context.organizationId || context.districtId) {
    requireTenant(actor, context.tenantId || context.organizationId || context.districtId);
  }
  if (SCHOOL_ROLES.has(actorRole(actor)) && (context.schoolId || context.school_id)) {
    requireSchoolScope(actor, context.schoolId || context.school_id);
  }
  return true;
}
