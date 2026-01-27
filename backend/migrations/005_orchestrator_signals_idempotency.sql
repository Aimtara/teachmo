-- Idempotency key to prevent duplicate signal processing (webhook retries, etc).
-- Postgres UNIQUE allows multiple NULLs, so it's safe.

ALTER TABLE orchestrator_signals
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orchs_family_idempotency
  ON orchestrator_signals (family_id, idempotency_key);
