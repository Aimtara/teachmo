# AI governance rules

Teachmo AI is advisory only. The implementation lives in `backend/compliance/aiGovernance.js`.

## Policy classes

- `low_risk`
- `educational_support`
- `student_sensitive`
- `ppra_sensitive`
- `high_stakes`
- `prohibited_without_human_review`

## High-stakes categories

- Academic placement
- Discipline
- Disability/accommodation
- Mental health/wellbeing
- Safety/emergency
- Risk scoring
- Intervention recommendation
- Student ranking
- Behavioral profiling

## Required controls

- `classifyAIUseCase()` detects sensitive and high-stakes use.
- `requireHumanReview()` routes high-stakes/PPRA paths for review.
- `blockFinalDecisionAI()` blocks AI final decision-making.
- `recordAITrace()` requires AI consent, redacts prompt/output content, labels output advisory, and emits audit events.
- Student data must not be used for model training unless `modelTrainingAuthorized` is explicit.
