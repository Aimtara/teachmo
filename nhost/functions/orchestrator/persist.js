import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.PG_CONNECTION_STRING ||
  process.env.NHOST_POSTGRES_CONNECTION_STRING ||
  process.env.NHOST_DATABASE_URL ||
  '';

let pool;

function getPool() {
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function insertOrchestratorRun(run) {
  const p = getPool();
  if (!p) return { persisted: false, reason: 'no_connection_string' };

  const {
    requestId,
    profileId,
    appRole,
    channel,
    route,
    confidence,
    safetyLevel,
    missingContext = [],
    extractedEntities = {},
    success = false,
    latencyMs,
    errorCode,
    errorMessage
  } = run;

  const q = `
    INSERT INTO orchestrator_runs
      (request_id, profile_id, app_role, channel, route, confidence, safety_level, missing_context, extracted_entities, success, latency_ms, error_code, error_message)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13)
    RETURNING id;
  `;

  const values = [
    requestId || null,
    profileId || null,
    appRole,
    channel,
    route,
    confidence,
    safetyLevel,
    JSON.stringify(missingContext),
    JSON.stringify(extractedEntities),
    success,
    latencyMs || null,
    errorCode || null,
    errorMessage || null
  ];

  const result = await p.query(q, values);
  return { persisted: true, runId: result.rows?.[0]?.id };
}

export async function insertOrchestratorArtifact({ runId, profileId, artifactType, payload, expiresAt }) {
  const p = getPool();
  if (!p) return { persisted: false, reason: 'no_connection_string' };
  if (!runId) return { persisted: false, reason: 'missing_runId' };

  const q = `
    INSERT INTO orchestrator_artifacts
      (run_id, profile_id, artifact_type, payload, expires_at)
    VALUES
      ($1,$2,$3,$4::jsonb,$5)
    RETURNING id;
  `;

  const result = await p.query(q, [
    runId,
    profileId || null,
    artifactType,
    JSON.stringify(payload || {}),
    expiresAt || null
  ]);

  return { persisted: true, artifactId: result.rows?.[0]?.id };
}
