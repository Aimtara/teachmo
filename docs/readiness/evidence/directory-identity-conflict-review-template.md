# Directory Identity Conflict Review Evidence Template

Status: **manual/live evidence required**

Use this packet when validating Gate 2 deterministic identity mapping with real or staging-safe directory data.

## Execution metadata

- Environment:
- Organization / tenant:
- Source system:
- Import job ID:
- Executor:
- Reviewer:
- Timestamp:

## Required proof

1. Upload or select a staging CSV/OneRoster-lite source containing:
   - one exact external-ID match,
   - one scoped email match,
   - one low-confidence name/date candidate,
   - one intentional duplicate/conflict candidate.
2. Run preview/dry-run only.
3. Confirm automatic matches only occur for allowed deterministic rules.
4. Confirm low-confidence and duplicate candidates are routed to manual review.
5. Reject or hold at least one unsafe conflict and capture the reason.
6. Confirm logs/events do not expose raw child/student PII beyond approved redacted fields.

## Evidence attachments

- Preview screenshot or exported redacted preview:
- Manual review queue screenshot:
- Conflict rejection/audit event ID:
- Redaction/log review link:
- Pass/fail decision:

