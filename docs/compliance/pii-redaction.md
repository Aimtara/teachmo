 # PII redaction and logging hygiene

 Teachmo logging must minimize child, student, guardian, school, prompt, and free-text concern data before it reaches logs, analytics, errors, support artifacts, or AI telemetry.

 ## Code

 - Central helpers: `backend/compliance/redaction.js`
 - Legacy Express compatibility wrapper: `backend/middleware/redactPII.js`
 - Logging scanner: `scripts/check-pii-logging.mjs`

 ## Rules

 - Use `redactPII()` for structured payloads.
 - Use `redactStudentPII()` for student records.
 - Use `redactPrompt()` for AI prompts and outputs; sensitive prompt text is not logged raw.
 - Use `safeLog()` and `safeAnalytics()` for new operational events.
 - Never log raw names, emails, phone numbers, addresses, student IDs, school IDs, disability/health/wellbeing data, free-text student concerns, prompts, or outputs.

 ## Release gate

 `npm run check:pii-logging` blocks unsafe logging patterns. Compliance foundation tests also assert adversarial PII fixtures are redacted.
