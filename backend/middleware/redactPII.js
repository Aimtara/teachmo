/* eslint-env node */
/*
 * Express middleware for PII redaction.
 *
 * The Teachmo backend has multiple logging touchpoints that may
 * inadvertently include personally identifiable information (PII)
 * such as student names or email addresses. To ensure that logs
 * remain safe for storage and analysis, this middleware intercepts
 * request bodies and response payloads before they are logged and
 * redacts any PII fields.
 *
 * To use this middleware, import it in your Express app and call
 * `app.use(redactPII())` before any routes that may emit logs.
 */

import { redactPII as redactCompliancePII } from '../compliance/redaction.ts';

const SENSITIVE_KEY_RE =
  /(password|passcode|secret|token|jwt|authorization|cookie|session|api[_-]?key|bearer|refresh|access[_-]?token|id[_-]?token|ssn|social|dob|^email$|^email_.*|.*_email$|^address$|^address_.*|.*_address$|^phone$|^phone_.*|.*_phone$)/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;
const SSN_RE_GLOBAL = /\b\d{3}-\d{2}-\d{4}\b/g;
const LONG_TOKEN_RE = /[A-Za-z0-9+/_=-]{32,}/;

export function redactPII(input) {
  if (input == null) return input;
  return redactCompliancePII(String(input)).replace(SSN_RE_GLOBAL, '[redacted-ssn]');
}

function redactValue(value, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (EMAIL_RE.test(value) || PHONE_RE.test(value) || SSN_RE.test(value) || LONG_TOKEN_RE.test(value)) {
      return '[REDACTED]';
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, maxDepth));
  }

  if (typeof value === 'object') {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_KEY_RE.test(key)) {
        output[key] = '[REDACTED]';
        continue;
      }
      output[key] = redactValue(entry, depth + 1, maxDepth);
    }
    return output;
  }

  return value;
}

/**
 * Factory function to create the PII redaction middleware. The
 * returned function conforms to the Express middleware signature.
 *
 * @returns {import('express').RequestHandler}
 */
export default function redactPIIMiddleware() {
  return function redactionMiddleware(req, res, next) {
    // Sanitize the request body if present. Only modify the body
    // if it is a plain object; other types (buffers, streams) are
    // ignored.
    if (req.body && typeof req.body === 'object') {
      try {
        req.body = redactValue(req.body);
      } catch (err) {
        // If redaction fails, proceed without modifying the body.
      }
    }

    // Avoid wrapping the response methods multiple times if this middleware
    // is applied more than once for the same request.
    if (res.locals && res.locals.__piiRedactionApplied) {
      return next();
    }
    if (res.locals) {
      res.locals.__piiRedactionApplied = true;
    }

    const originalSend = res.send.bind(res);
    const originalJson = res.json ? res.json.bind(res) : null;

    const redactBody = (body) => {
      if (body && typeof body === 'object') {
        try {
          return redactValue(body);
        } catch (err) {
          // Ignore redaction failures and fall through to returning the original body.
        }
      }
      return body;
    };

    // Intercept response payloads by overriding res.send and res.json. This ensures
    // that any error or data objects passed through these methods are redacted.
    res.send = (body) => {
      const redactedBody = redactBody(body);
      return originalSend(redactedBody);
    };

    if (originalJson) {
      res.json = (body) => {
        const redactedBody = redactBody(body);
        return originalJson(redactedBody);
      };
    }
    next();
  };
}
