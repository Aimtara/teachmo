export type HasuraClient = (query: string, variables?: Record<string, any>) => Promise<any>;

const RATE_LIMIT_WINDOWS = [
  { windowSeconds: 60, limit: 10 },
  { windowSeconds: 86400, limit: 50 },
];

type CounterWindow = {
  windowSeconds: number;
  limit: number;
  windowStart: string;
};

function windowStart(windowSeconds: number): string {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

async function getCounterWindow(hasura: HasuraClient, actorId: string, counter: CounterWindow) {
  const resp = await hasura(
    `query C($actorId: uuid!, $windowStart: timestamptz!, $windowSeconds: Int!) {
      invite_send_counters(
        where: {
          actor_id: { _eq: $actorId },
          window_start: { _eq: $windowStart },
          window_seconds: { _eq: $windowSeconds }
        },
        limit: 1
      ) {
        id
        count
      }
    }`,
    { actorId, windowStart: counter.windowStart, windowSeconds: counter.windowSeconds }
  );

  const row = resp?.data?.invite_send_counters?.[0] ?? null;
  return { id: row?.id ?? null, count: Number(row?.count ?? 0) };
}

async function updateCounter(hasura: HasuraClient, actorId: string, counter: CounterWindow, incrementBy: number) {
  if (counter.limit <= 0 || incrementBy <= 0) return { allowed: true, count: 0 };

  const current = await getCounterWindow(hasura, actorId, counter);
  const nextCount = current.count + incrementBy;
  if (nextCount > counter.limit) return { allowed: false, count: nextCount };

  if (current.id) {
    await hasura(
      `mutation UpdateCounter($id: uuid!, $inc: Int!) {
        update_invite_send_counters_by_pk(pk_columns: { id: $id }, _inc: { count: $inc }) { id }
      }`,
      { id: current.id, inc: incrementBy }
    );
    return { allowed: true, count: nextCount };
  }

  try {
    await hasura(
      `mutation InsertCounter($object: invite_send_counters_insert_input!) {
        insert_invite_send_counters_one(object: $object) { id }
      }`,
      {
        object: {
          actor_id: actorId,
          window_start: counter.windowStart,
          window_seconds: counter.windowSeconds,
          count: incrementBy,
        },
      }
    );
    return { allowed: true, count: nextCount };
  } catch (error) {
    console.warn('invite counter insert failed, retrying update', error);
    const latest = await getCounterWindow(hasura, actorId, counter);
    const retryCount = latest.count + incrementBy;
    if (retryCount > counter.limit) return { allowed: false, count: retryCount };

    if (latest.id) {
      await hasura(
        `mutation UpdateCounter($id: uuid!, $inc: Int!) {
          update_invite_send_counters_by_pk(pk_columns: { id: $id }, _inc: { count: $inc }) { id }
        }`,
        { id: latest.id, inc: incrementBy }
      );
      return { allowed: true, count: retryCount };
    }

    return { allowed: false, count: retryCount };
  }
}

export async function enforceInviteRateLimits(hasura: HasuraClient, actorId: string, inviteCount: number) {
  const windows: CounterWindow[] = RATE_LIMIT_WINDOWS.map((entry) => ({
    ...entry,
    windowStart: windowStart(entry.windowSeconds),
  }));

  for (const win of windows) {
    const result = await updateCounter(hasura, actorId, win, inviteCount);
    if (!result.allowed) return { allowed: false, window: win, count: result.count };
  }

  return { allowed: true };
}
