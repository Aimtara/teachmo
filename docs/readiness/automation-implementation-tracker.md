# Automation Implementation Tracker (GO/NO-GO Closure)

## Status legend
- [ ] not started
- [~] in progress
- [x] complete

## 1) Dependency and security automation
- [ ] Add `check:audit` script to package scripts.
- [ ] Create `config/audit-exceptions.json` with expiry + owner schema.
- [ ] Wire `check:audit` into CI launch gates.
- [ ] Add `docs/readiness/dependency-security-burndown.md` and keep current.

## 2) API boundary automation
- [x] Keep `check:api-boundaries` script operational.
- [ ] Add/update `docs/readiness/api-boundary-exceptions.md` with owner/date/risk.
- [ ] CI ratchet: fail if exception count increases.
- [ ] CI ratchet: reject new exceptions without issue link/owner/target.

## 3) Lint ratchet automation
- [ ] Restore/replace `check:lint-ratchet` and document command.
- [ ] Add machine-readable lint baseline artifact.
- [ ] CI ratchet on error count + parser/no-undef deltas.

## 4) Bundle budget automation
- [x] Keep `check:size` command operational.
- [ ] Add/update `docs/readiness/bundle-size-plan.md` with hybrid budget policy.
- [ ] CI ratchet for app-shell and largest chunk budgets.

## 5) Metadata/schema validation automation
- [ ] Add Hasura metadata drift check in CI.
- [ ] Add migration consistency check in CI.
- [ ] Document local runbook for metadata/schema validation.

## 6) Browser quality automation
- [ ] Add/verify Playwright smoke in CI (critical flows only).
- [ ] Add/verify automated a11y smoke in CI.
- [ ] Add doc for environment prerequisites and known blockers.

## 7) Collaboration and governance automation
- [ ] Add/verify CODEOWNERS coverage for readiness-critical paths.
- [ ] Add PR template checklist requiring evidence links for gate-impacting changes.
- [ ] Add bot/check that blocks merges when required readiness checks are missing.

## 8) Synthetic monitoring automation
- [ ] Add scheduled healthz and key-route probes.
- [ ] Add alert routing verification for probe failures.
- [ ] Add dashboard/runbook links for synthetic checks.
