export type ActorScope = {
  role: string;
  schoolId: string | null;
  districtId: string | null;
};

export async function getActorScope(
  hasura: (query: string, variables: any) => Promise<any>,
  actorId: string
): Promise<ActorScope> {
  const q = `
    query Scope($id: uuid!) {
      user_profiles_by_pk(user_id: $id) { role school_id district_id }
    }
  `;
  const r = await hasura(q, { id: actorId });
  const p = r?.data?.user_profiles_by_pk;
  return {
    role: String(p?.role ?? ''),
    schoolId: p?.school_id ? String(p.school_id) : null,
    districtId: p?.district_id ? String(p.district_id) : null,
  };
}

export async function emailAllowedForSchool(
  hasura: (query: string, variables: any) => Promise<any>,
  email: string,
  schoolId: string
): Promise<boolean> {
  const q = `
    query Allowed($email: citext!, $schoolId: uuid!) {
      school_contact_directory(where: { email: { _eq: $email }, school_id: { _eq: $schoolId } }, limit: 1) { id }
    }
  `;
  const r = await hasura(q, { email, schoolId });
  return Boolean(r?.data?.school_contact_directory?.[0]?.id);
}
