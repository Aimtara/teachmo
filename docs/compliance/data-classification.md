# Data classification registry

Teachmo classifies sensitive objects in `backend/compliance/dataClassification.js`.

The registry covers users, students, guardians, schools, tenants, rosters, messages, weekly digests, assignments, AI prompts/outputs/recommendations, consent records, audit logs, admin actions, community/media content, PPRA-sensitive prompts, and accessibility evidence.

Required helper behavior:
- `classifyEntity(entityName)` returns explicit classification metadata or `classified: false`.
- `requiresAudit`, `requiresConsent`, `requiresExport`, and `requiresDeletion` derive controls from registry metadata.
- `isStudentSensitive`, `isAISensitive`, and `isPPRASensitive` provide fail-closed checks for sensitive flows.

New sensitive entities must be added to the registry and covered by `backend/__tests__/complianceFoundations.test.js`.
