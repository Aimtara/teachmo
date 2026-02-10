/**
 * Regex-based safety scanner with lightweight guardrails for public partner content.
 */

const SAFETY_PATTERNS = {
  pii_ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  pii_email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  pii_phone: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  safety_profanity: /\b(badword1|badword2|unsafe)\b/i,
  high_pressure_sales: /\b(act now|limited time|buy immediately|guaranteed results)\b/i,
};

export function scanContent(content) {
  const flags = [];
  const text = JSON.stringify(content ?? {}).toLowerCase();

  if (SAFETY_PATTERNS.pii_ssn.test(text)) flags.push('Potential SSN detected');
  if (SAFETY_PATTERNS.pii_email.test(text)) flags.push('PII: Email addresses detected in public content');
  if (SAFETY_PATTERNS.pii_phone.test(text)) flags.push('PII: Phone number detected in public content');
  if (SAFETY_PATTERNS.safety_profanity.test(text)) flags.push('Safety: Potential profanity or unsafe language detected');
  if (SAFETY_PATTERNS.high_pressure_sales.test(text)) flags.push('Tone: High-pressure sales language detected');

  return {
    isSafe: flags.length === 0,
    severity: flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'none',
    flags,
  };
}
