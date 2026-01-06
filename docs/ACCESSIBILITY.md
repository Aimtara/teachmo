# Accessibility workflows

## Automated testing

### Unit tests (jest-axe)
- Add `.a11y.test.jsx`/`.a11y.test.tsx` files under `src/` to run axe checks during Jest.
- Run locally:
  - `npm run test:a11y`

### E2E tests (Playwright + axe)
- Add Playwright specs under `tests/e2e` and use `@axe-core/playwright` for page audits.
- Run locally:
  - `npm run e2e:a11y`

## Manual audit checklist (WCAG 2.1 AA)
- Keyboard navigation: ensure all interactive elements are reachable and visible focus states are present.
- Contrast: verify foreground/background contrast for text and icons meets AA.
- ARIA: use semantic elements, proper labels, and valid ARIA attributes.
- Dynamic content: confirm focus is managed when dialogs/menus open and close.

## CI enforcement
- CI runs `npm run test:a11y` and `npm run e2e:a11y` in `.github/workflows/ci.yml`.
