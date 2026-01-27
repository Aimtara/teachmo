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

## Testing expectations

- Unit tests for new business logic (LLM prompts, date logic, data transforms).
- E2E coverage for role‑based routing and admin flows.
- Add test IDs for complex flows instead of brittle selectors.
