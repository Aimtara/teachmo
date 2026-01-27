// Default retention (non-legal-hold) for message content.
// Aligns with recommended default: 365 days with redaction policy:contentReference[oaicite:2]{index=2}.
export const MESSAGE_RETENTION_DAYS = 365;

export function retentionCutoffDate(days: number = MESSAGE_RETENTION_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
