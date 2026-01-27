/* eslint-env node */
import { query } from '../db.js';

const DEFAULT_TIMEOUT_MS = 8000;

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function shouldAlert(severity) {
  // Default policy: alert on warn+ (you can tune this later)
  return severity === 'warn' || severity === 'error';
}

function allowedEndpointTypesForSeverity(severity) {
  if (severity === 'warn') return new Set(['slack']);
  if (severity === 'error') return new Set(['pagerduty', 'webhook']);
  return new Set([]);
}

function pagerDutyPayload({ routingKey, dedupKey, summary, customDetails }) {
  return {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: dedupKey,
    payload: {
      summary,
      source: 'teachmo',
      severity: 'error',
      timestamp: new Date().toISOString(),
      custom_details: customDetails ?? {}
    }
  };
}

function dedupeKey({ endpointId, familyId, anomalyType, minutes }) {
  // Bucket by N-minute window so we don’t spam.
  const now = Date.now();
  const windowMs = minutes * 60 * 1000;
  const bucket = Math.floor(now / windowMs);
  return `a:${endpointId}:${familyId}:${anomalyType}:${bucket}`;
}

async function fetchWithTimeout(url, opts, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, text: text.slice(0, 1200) };
  } finally {
    clearTimeout(timeout);
  }
}

function signPayload(secret, body) {
  // Lightweight signature (not crypto-strong HMAC; upgrade to crypto/HMAC if desired)
  // Keeping dependency-free for now.
  if (!secret) return null;
  let hash = 0;
  const input = secret + body;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `simple-${hash}`;
}

export async function sendAnomalyAlerts({ familyId, anomalyType, severity, meta }) {
  const enabled = String(process.env.ALERTS_ENABLED ?? 'true').toLowerCase() === 'true';
  if (!enabled) return { sent: 0, failed: 0, skipped: 0 };

  if (!shouldAlert(severity)) return { sent: 0, failed: 0, skipped: 0 };

  const allowed = allowedEndpointTypesForSeverity(severity);
  if (allowed.size === 0) return { sent: 0, failed: 0, skipped: 0 };

  const dedupeMinutes = clampInt(process.env.ALERT_DEDUPE_MINUTES ?? 60, 5, 1440);

  const endpoints = await query(
    `
    SELECT id, type, target, secret
    FROM orchestrator_alert_endpoints
    WHERE family_id = $1 AND enabled = true
    `,
    [familyId]
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const ep of endpoints.rows) {
    if (!allowed.has(ep.type)) {
      skipped += 1;
      continue;
    }

    const dk = dedupeKey({ endpointId: ep.id, familyId, anomalyType, minutes: dedupeMinutes });

    // Deduped already?
    const seen = await query(
      `SELECT 1 FROM orchestrator_alert_deliveries WHERE dedupe_key = $1 LIMIT 1`,
      [dk]
    );
    if (seen.rowCount > 0) {
      skipped += 1;
      continue;
    }

    const payload = {
      kind: 'teachmo.anomaly',
      familyId,
      anomalyType,
      severity,
      occurredAt: new Date().toISOString(),
      meta: meta ?? {}
    };

    // Deliver based on endpoint type
    let status = 'sent';
    let responseCode = null;
    let responseBody = null;

    try {
      if (ep.type === 'slack') {
        // Slack incoming webhook expects { text: "..."}
        const text =
          `🚨 Teachmo anomaly (${severity}): *${anomalyType}*\n` +
          `Family: ${familyId}\n` +
          `Meta: ${JSON.stringify(payload.meta).slice(0, 700)}`;

        const r = await fetchWithTimeout(ep.target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        responseCode = r.status;
        responseBody = r.text;
        status = r.ok ? 'sent' : 'failed';
      } else if (ep.type === 'webhook') {
        const body = JSON.stringify(payload);
        const sig = signPayload(ep.secret, body);

        const headers = { 'Content-Type': 'application/json' };
        if (sig) headers['X-Teachmo-Signature'] = sig;

        const r = await fetchWithTimeout(ep.target, { method: 'POST', headers, body });
        responseCode = r.status;
        responseBody = r.text;
        status = r.ok ? 'sent' : 'failed';
      } else if (ep.type === 'pagerduty') {
        const routingKey = ep.secret;
        if (!routingKey) {
          status = 'failed';
          responseBody = 'pagerduty_missing_routing_key_in_secret';
        } else {
          const pdUrl =
            ep.target && ep.target.startsWith('http')
              ? ep.target
              : 'https://events.pagerduty.com/v2/enqueue';

          const body = pagerDutyPayload({
            routingKey,
            dedupKey: dk,
            summary: `Teachmo anomaly: ${anomalyType} (family ${familyId})`,
            customDetails: payload
          });

          const r = await fetchWithTimeout(pdUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          responseCode = r.status;
          responseBody = r.text;
          status = r.ok ? 'sent' : 'failed';
        }
      } else if (ep.type === 'email') {
        // Minimal “hook”: treat email as a webhook to your email service
        // If you don’t have one, you can still store endpoints now and wire later.
        status = 'skipped';
        responseBody = 'email_not_implemented';
      } else {
        status = 'skipped';
        responseBody = `unknown_endpoint_type:${ep.type}`;
      }
    } catch (e) {
      status = 'failed';
      responseBody = e instanceof Error ? e.message : String(e);
    }

    await query(
      `
      INSERT INTO orchestrator_alert_deliveries
        (endpoint_id, family_id, anomaly_type, severity, dedupe_key, status, response_code, response_body, payload_json)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [ep.id, familyId, anomalyType, severity, dk, status, responseCode, responseBody, JSON.stringify(payload)]
    );

    if (status === 'sent') sent += 1;
    else if (status === 'failed') failed += 1;
    else skipped += 1;
  }

  return { sent, failed, skipped };
}
