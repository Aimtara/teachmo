import crypto from 'crypto';
import { getActorScope } from '../_shared/tenantScope';

type DirectoryRow = { email: string; contact_type: string };
type JobError = { reason: string; message?: string; row?: number };

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

function normEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function parseCsv(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) throw new Error("CSV must include 'email' header");

  const header = lines.shift()!.split(',').map((h) => h.trim());
  const idxEmail = header.findIndex((h) => h.toLowerCase() === 'email');
  const idxType = header.findIndex((h) => h.toLowerCase() === 'contact_type');
  if (idxEmail < 0) throw new Error("CSV must include 'email' header");

  const rows = lines.map((line) => line.split(','));
  return { idxEmail, idxType, rows };
}

function isEmailLike(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { csvText, schoolId, deactivateMissing, dryRun, sourceRef } = req.body ?? {};
  const text = String(csvText ?? '');
  if (!text) return res.status(200).json({ ok: true, jobId: null });

  async function hasura(query: string, variables?: Record<string, any>) {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  }

  let scope: Awaited<ReturnType<typeof getActorScope>> | null = null;
  let sid = String(schoolId ?? '').trim();
  if (!sid) {
    scope = await getActorScope(hasura, actorId);
    sid = scope.schoolId ?? '';
  }

  if (!sid) return res.status(400).json({ ok: false, reason: 'school_required' });

  const sourceHash = sha256(`${sid}::${text}`);

  const jobInsert = await hasura(
    `mutation InsertJob($object: directory_import_jobs_insert_input!) {
      insert_directory_import_jobs_one(object: $object) { id }
    }`,
    {
      object: {
        actor_id: actorId,
        school_id: sid,
        district_id: scope?.districtId ?? null,
        source_type: 'csv',
        source_ref: sourceRef ?? null,
        source_hash: sourceHash,
        status: 'running',
      },
    }
  );

  const jobId = jobInsert?.data?.insert_directory_import_jobs_one?.id;
  if (!jobId) return res.status(500).json({ ok: false, reason: 'job_not_created' });

  try {
    const { idxEmail, idxType, rows } = parseCsv(text);

    const seen = new Set<string>();
    const valid: DirectoryRow[] = [];
    const errors: JobError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const email = normEmail(rows[i][idxEmail] ?? '');
      const contactType = String((idxType >= 0 ? rows[i][idxType] : 'parent_guardian') ?? 'parent_guardian').trim();

      if (!email || !isEmailLike(email)) {
        if (errors.length < 50) errors.push({ row: i + 2, reason: 'invalid_email' });
        continue;
      }

      if (seen.has(email)) continue;
      seen.add(email);
      valid.push({ email, contact_type: contactType || 'parent_guardian' });
    }

    const nowIso = new Date().toISOString();
    let upserted = 0;
    let deactivated = 0;

    if (!dryRun) {
      const upsertResp = await hasura(
        `mutation Upsert($objects: [school_contact_directory_insert_input!]!) {
          insert_school_contact_directory(
            objects: $objects,
            on_conflict: {
              constraint: school_contact_directory_school_id_email_key,
              update_columns: [contact_type, is_active, updated_at, deactivated_at]
            }
          ) { affected_rows }
        }`,
        {
          objects: valid.map((row) => ({
            school_id: sid,
            email: row.email,
            contact_type: row.contact_type,
            is_active: true,
            deactivated_at: null,
            updated_at: nowIso,
            created_by: actorId,
          })),
        }
      );

      upserted = upsertResp?.data?.insert_school_contact_directory?.affected_rows ?? 0;

      if (deactivateMissing) {
        const deactivateResp = await hasura(
          `mutation Deactivate($schoolId: uuid!, $emails: [citext!]!, $timestamp: timestamptz!) {
            update_school_contact_directory(
              where: { school_id: { _eq: $schoolId }, email: { _nin: $emails }, is_active: { _eq: true } },
              _set: { is_active: false, deactivated_at: $timestamp, updated_at: $timestamp }
            ) { affected_rows }
          }`,
          { schoolId: sid, emails: Array.from(seen), timestamp: nowIso }
        );

        deactivated = deactivateResp?.data?.update_school_contact_directory?.affected_rows ?? 0;
      }

      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action: 'directory:import',
            entity_type: 'school_contact_directory',
            entity_id: sid,
            metadata: {
              totalRows: rows.length,
              totalValid: valid.length,
              invalid: rows.length - valid.length,
              deactivateMissing: Boolean(deactivateMissing),
              dryRun: Boolean(dryRun),
            },
          },
        }
      );
    }

    const stats = {
      totalRows: rows.length,
      totalValid: valid.length,
      invalid: rows.length - valid.length,
      upserted,
      deactivated,
      deactivateMissing: Boolean(deactivateMissing),
      dryRun: Boolean(dryRun),
    };

    await hasura(
      `mutation Finish($id: uuid!, $stats: jsonb!, $errors: jsonb!, $timestamp: timestamptz!) {
        update_directory_import_jobs_by_pk(
          pk_columns: { id: $id },
          _set: { status: "completed", finished_at: $timestamp, stats: $stats, errors: $errors }
        ) { id }
      }`,
      { id: jobId, stats, errors, timestamp: nowIso }
    );

    return res.status(200).json({ ok: true, jobId, stats: { totalRows: rows.length, totalValid: valid.length } });
  } catch (error: any) {
    console.error('import-school-directory-csv failed', error);

    const failTimestamp = new Date().toISOString();

    await hasura(
      `mutation Fail($id: uuid!, $errors: jsonb!, $timestamp: timestamptz!) {
        update_directory_import_jobs_by_pk(
          pk_columns: { id: $id },
          _set: { status: "failed", finished_at: $timestamp, errors: $errors }
        ) { id }
      }`,
      { id: jobId, errors: [{ reason: 'exception', message: String(error?.message ?? error) }], timestamp: failTimestamp }
    );

    return res.status(200).json({ ok: true, jobId, failed: true });
  }
};
