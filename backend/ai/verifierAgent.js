/* eslint-env node */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;

function redactPII(text) {
  let output = String(text || '');
  output = output.replace(EMAIL_RE, '[redacted-email]');
  output = output.replace(PHONE_RE, '[redacted-phone]');
  output = output.replace(SSN_RE, '[redacted-ssn]');
  return output;
}

export async function verifyResponse({
  content,
  decision,
  tenant = {},
  actor = {},
}) {
  const issues = [];
  let verifiedContent = String(content || '');

  if (!verifiedContent.trim()) {
    issues.push('empty_response');
  }

  if (
    decision?.denialReason === 'consent_required' ||
    decision?.denialReason === 'guardian_verification_required'
  ) {
    const redacted = redactPII(verifiedContent);
    if (redacted !== verifiedContent) {
      verifiedContent = redacted;
      issues.push('pii_redacted');
    }
  }

  if (
    tenant?.schoolId &&
    actor?.role === 'teacher' &&
    /\b(other school|another school|cross-school)\b/i.test(verifiedContent)
  ) {
    issues.push('cross_scope_reference');
  }

  return {
    ok: issues.length === 0,
    issues,
    content: verifiedContent,
  };
}
