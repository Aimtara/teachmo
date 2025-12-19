import { createHasuraClient } from '../_shared/hasuraClient';

export default async function handler(req: any, res: any) {
  const hasura = await createHasuraClient();
  const schoolId = req.body?.schoolId || req.query?.schoolId;
  if (!schoolId) {
    res.status(400).json({ error: 'missing_school_id' });
    return;
  }

  const data = await hasura(
    `query Cursors($schoolId: uuid!) {
      directory_sources(where: { school_id: { _eq: $schoolId } }) {
        id
        name
        source_type
        cursor: directory_source_cursors {
          last_full_sync_at
          last_delta_sync_at
          last_success_run_id
          oneroster_last_delta_datetime
          clever_last_event_id
          clever_last_event_created
        }
      }
    }`,
    { schoolId }
  );

  res.status(200).json({ data: data?.data?.directory_sources ?? [] });
}
