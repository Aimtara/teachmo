import { Client } from 'pg';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.PG_CONNECTION_STRING ||
    process.env.NHOST_DATABASE_URL ||
    process.env.PG_URI ||
    null
  );
}

function normalizeUuid(value) {
  if (!value) return null;
  if (UUID_REGEX.test(value)) return value;
  return null;
}

export async function persistOrchestratorRun({ request, response, latencyMs }) {
  const connectionString = resolveConnectionString();
  if (!connectionString) return null;

  const client = new Client({ connectionString });
  try {
    await client.connect();

    const result = await client.query(
      `insert into public.orchestrator_runs
        (request_id, user_id, role, channel, route, confidence, missing_context, safety_level, safety_reasons, success, latency_ms)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id`,
      [
        request.requestId,
        normalizeUuid(request.actor?.userId),
        request.actor?.role || null,
        request.channel || null,
        response.route || null,
        response.confidence ?? null,
        response.needs?.missing ? JSON.stringify(response.needs.missing) : null,
        response.safety?.level || null,
        response.safety?.reasons ? JSON.stringify(response.safety.reasons) : null,
        Boolean(response.success ?? (response.needs?.missing?.length ? false : true)),
        latencyMs ?? null
      ]
    );

    return result.rows?.[0]?.id || null;
  } catch (error) {
    console.warn('orchestrator persist failed', error);
    return null;
  } finally {
    await client.end().catch(() => null);
  }
}

export async function persistArtifacts({ runId, artifacts }) {
  if (!runId || !Array.isArray(artifacts) || artifacts.length === 0) return;
  const connectionString = resolveConnectionString();
  if (!connectionString) return;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    for (const artifact of artifacts) {
      await client.query(
        `insert into public.orchestrator_artifacts (run_id, type, payload, expires_at)
         values ($1, $2, $3, $4)`,
        [
          runId,
          artifact.type,
          JSON.stringify(artifact.payload ?? {}),
          artifact.expiresAt || null
        ]
      );
    }
  } catch (error) {
    console.warn('orchestrator artifact persist failed', error);
  } finally {
    await client.end().catch(() => null);
  }
}
