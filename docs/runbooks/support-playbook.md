# Support Playbook

Generated: 2026-05-03

## Purpose

This playbook defines the controlled-pilot support model for Teachmo. It is not
complete until publication evidence is attached in the release evidence folder.

## Severity levels

| Severity | Examples | Response SLA | Escalation |
| --- | --- | --- | --- |
| Sev 1 | Cross-tenant access, auth bypass, data loss, child safety incident | 15 minutes | Incident commander, security/privacy, engineering lead, executive sponsor |
| Sev 2 | Messaging/digest outage, roster sync corrupting records, admin action failures | 1 hour | Engineering on-call, product owner, support lead |
| Sev 3 | Single-user workflow bug, delayed sync, minor a11y issue | 1 business day | Support triage, product/engineering queue |
| Sev 4 | How-to request, copy/docs issue | 3 business days | Support queue |

## Triage checklist

1. Capture reporter, tenant/school, role, browser/device, timestamp, and route.
2. Assign severity and incident owner.
3. Check Sentry/release SHA, backend health, Nhost/Hasura status, and relevant runbook.
4. For PII/safety issues, stop copying raw payloads into tickets; use redacted IDs only.
5. Record customer-facing update cadence.
6. Record resolution and follow-up owner.

## Runbook links

- Messaging delivery SLO: `docs/runbooks/messaging-delivery-slo.md`
- Digest reliability: `docs/runbooks/digest-reliability.md`
- Assignments sync: `docs/runbooks/assignments-sync.md`
- Backup/restore: `docs/runbooks/G4_BACKUP_RESTORE.md`
- Rollback: `docs/runbooks/G4_ROLLBACK.md`
- Incident response: `docs/runbooks/G4_INCIDENT_RESPONSE.md`

## Communication templates

### Initial acknowledgement

> Thanks for reporting this. We are investigating under incident `<ID>`.
> Current severity: `<severity>`. Next update by `<time>`.

### Mitigation update

> We identified the affected workflow as `<workflow>`. A mitigation is in
> progress: `<mitigation>`. No raw student/child data is included in this ticket.

### Resolution

> The issue is resolved as of `<time>` in release `<sha>`. Follow-up action:
> `<owner/action/date>`.

## Publication evidence required

- Link or screenshot showing this playbook is published in the support knowledge base.
- On-call roster and escalation channel.
- Named owners for support lead, engineering lead, privacy lead, and product lead.
- Date of review and approver.
