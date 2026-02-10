/**
 * Automated Safety & PII Scanner for User Generated Content
 */

const PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  profanity: /\b(damn|hell|asshole)\b/i,
  pressure: /\b(buy now|hurry|limited time offer)\b/i,
};

export function scanContent(content) {
  const textToCheck = typeof content === 'string' ? content : JSON.stringify(content);
  const flags = [];

  if (PATTERNS.ssn.test(textToCheck)) flags.push('PII: SSN detected');
  if (PATTERNS.email.test(textToCheck)) flags.push('PII: Email address detected in public field');
  if (PATTERNS.phone.test(textToCheck)) flags.push('PII: Phone number detected');
  if (PATTERNS.profanity.test(textToCheck)) flags.push('Safety: Profanity detected');
  if (PATTERNS.pressure.test(textToCheck)) flags.push('Tone: High-pressure sales language');

  return {
    isSafe: flags.length === 0,
    flags,
  };
}
