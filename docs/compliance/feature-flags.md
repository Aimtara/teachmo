# Risky Feature Flags

Teachmo disables risky child/student data features by default until their required privacy and security gates are complete.

Source of truth:
- `config/feature_flags.json`
- `backend/config/feature_flags.json`
- `src/config/features.ts`

Each risky flag must include:
- `owner`
- `reason`
- `requiredGates`
- `defaultEnabled: false`
- `environmentOverrides`
- test matrix coverage

Currently gated risky features include:
- `COMMUNITY`
- `GAMIFICATION`
- `LEADERBOARDS`
- `RANKINGS`
- `CHALLENGES`
- `PARTNER_PORTAL`
- `ASSIGNMENT_SYNC`
- `OFFICE_HOURS`
- `AI_SENSITIVE_RECOMMENDATIONS`
- `ADMIN_ANALYTICS_SENSITIVE`
- `SAFESPACE_EMERGENCY_NOTIFIER`
- `LTI_DEEP_INTEGRATIONS`

Flag changes are admin actions and must be audited as `feature_flag.updated`.
