# Contributor Guidelines

## Coding standards

- Prefer TypeScript for shared logic and serverless functions.
- Keep GraphQL queries near their usage; avoid overfetching.
- Use shared helpers in `src/lib` and `nhost/functions/_shared` to reduce duplication.
- Avoid `try/catch` around imports (per project linting standards).
- Ensure logs are actionable and avoid PII in server logs.

## UX guidelines

- Maintain calm, supportive language for parent‑facing content.
- Reduce cognitive load: shorter paragraphs, clear headings, and whitespace.
- Avoid directive phrasing ("remember to", "make sure") in AI outputs.
- Provide clear loading and offline states.
- Prioritize accessibility: keyboard navigation, labels, and focus states.
- Use `src/design/tokens.ts` and the enterprise CSS variables for command-center/admin UI; do not hard-code Teachmo brand colors in components.
- Enterprise components must support light, dark, and high-contrast modes, reduced motion, visible focus rings, ARIA labels, and keyboard operation.
- Document reusable admin primitives in Storybook and include motion/accessibility notes when adding new dashboard, table, badge, or overlay patterns.

## Testing expectations

- Unit tests for new business logic (LLM prompts, date logic, data transforms).
- E2E coverage for role‑based routing and admin flows.
- Add test IDs for complex flows instead of brittle selectors.
- For enterprise UI work, add focused component tests plus a Playwright smoke covering theme switching, command palette behavior, and role-adaptive content.


## AI governance guardrails

- Treat `docs/ai-governance-principles.md` as SSOT for governed AI behavior.
- Run policy evaluation before any external model call.
- Sanitize outbound model payloads and keep logs privacy-safe.
- Gate governed AI rollout by tenant-scoped feature flags.
- For high-stakes AI, separate generation from verification and support shadow mode first.
- Ensure telemetry includes request id, policy outcome, matched policies, denial reason, required skill, tenant scope, and verifier status.
- Update docs/ADR when materially changing policy logic or governance architecture.
