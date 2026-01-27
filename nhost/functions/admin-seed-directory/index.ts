import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';

const allowedRoles = new Set(['admin', 'system_admin', 'district_admin']);

type DirectoryEntry = {
  school_id: string;
  district_id?: string | null;
  email: string;
  contact_type?: string;
};

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  if (!allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { schoolId, districtId, emails, entries, contactType } = req.body ?? {};
  const normalizedSchoolId = String(schoolId ?? '').trim();

  const emailList: string[] = Array.isArray(emails) ? emails.map((e) => String(e ?? '').trim().toLowerCase()) : [];
  const entryList: DirectoryEntry[] = Array.isArray(entries)
    ? entries
        .map((entry) => ({
          school_id: normalizedSchoolId || String(entry.schoolId ?? entry.school_id ?? '').trim(),
          district_id: String(entry.districtId ?? entry.district_id ?? districtId ?? '').trim() || null,
          email: String(entry.email ?? '').trim().toLowerCase(),
          contact_type: String(entry.contactType ?? entry.contact_type ?? contactType ?? 'parent_guardian'),
        }))
        .filter((entry) => entry.school_id && entry.email)
    : [];

  const objects: DirectoryEntry[] = [
    ...entryList,
    ...emailList
      .filter(Boolean)
      .map((email) => ({
        school_id: normalizedSchoolId,
        district_id: String(districtId ?? '').trim() || null,
        email,
        contact_type: contactType ?? 'parent_guardian',
      }))
      .filter((row) => row.school_id && row.email),
  ];

  const fallbackSchool = normalizedSchoolId || (entryList?.[0]?.school_id ?? '');
  if (objects.length === 0 && fallbackSchool) {
    objects.push(
      { school_id: fallbackSchool, district_id: districtId ?? null, email: 'family.one@example.com', contact_type: 'parent_guardian' },
      { school_id: fallbackSchool, district_id: districtId ?? null, email: 'family.two@example.com', contact_type: 'parent_guardian' }
    );
  }

  if (objects.length === 0) {
    return res.status(400).json({ ok: false, reason: 'missing_school_or_email' });
  }

  const scopeSchoolId = objects[0]?.school_id ?? fallbackSchool;
  const scopeDistrictId = objects[0]?.district_id ?? districtId ?? null;

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

  try {
    const scopes = await getEffectiveScopes({
      hasura,
      districtId: scopeDistrictId || null,
      schoolId: scopeSchoolId || null,
    });
    assertScope(scopes, 'directory.email', true);

    const resp = await hasura(
      `mutation Seed($objects: [school_contact_directory_insert_input!]!) {
        insert_school_contact_directory(
          objects: $objects,
          on_conflict: { constraint: school_contact_directory_school_id_email_key, update_columns: [] }
        ) { affected_rows }
      }`,
      { objects }
    );

    const inserted = resp?.data?.insert_school_contact_directory?.affected_rows ?? 0;
    return res.status(200).json({ ok: true, inserted, attempted: objects.length });
  } catch (error) {
    console.error('admin-seed-directory failed', error);
    return res.status(500).json({ ok: false });
  }
};
