# ADR 0009 — Accessibility, Inclusion & Equitable Design Enforcement

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Design
- **Applies to:** Frontend UI, content generation, AI outputs, pilot acceptance

## Context

Teachmo serves parents with limited time and tech literacy, caregivers with disabilities, multilingual households, and neurodivergent children and adults. Accessibility failures are deal-breakers in district pilots. Accessibility must be enforced system-wide, not treated as a checklist.

## Decision Summary

Teachmo adopts WCAG 2.1 AA as a minimum standard and treats accessibility as a first-class product constraint. Accessibility is a release gate enforced across UI components, navigation patterns, content (including AI), and pilot acceptance criteria.

## Accessibility Baseline (Non-Negotiable)

### Visual & Interaction

- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI affordances
- Visible focus indicators on all interactive elements
- Keyboard navigation for all flows
- No information conveyed by color alone
- Minimum touch targets: 44×44 px

### Structure & Semantics

- Correct heading hierarchy (h1 → h2 → h3)
- Landmark regions (nav, main, footer)
- Form inputs with associated labels
- Error messages programmatically associated with fields

### Motion & Sensory Safety

- Respect prefers-reduced-motion
- Avoid flashing or rapid animations
- Calm transitions by default
- No surprise audio

### Inclusive Content & Language

- Short sentences, concrete suggestions, minimal jargon
- Reading level target: Grade 6–8 for parent-facing content

### Neurodiversity-Aware Design

- Offer alternatives proactively (“If loud play is tough today…”)
- Avoid absolute language (“always,” “must,” “best”)
- Never pathologize behaviors; no assumptions of diagnosis

### Cultural & Family Inclusion

- Avoid normative assumptions (e.g., “mom/dad,” “two parents”)
- Support nontraditional caregivers
- Avoid shame-based framing; respect varied parenting styles

### AI Accessibility Rules (Critical)

AI-generated content must be scannable (bullets, short paragraphs), avoid medical/legal authority, offer at least one low-energy alternative, include optional scripts (“words to try”), and never imply judgment or failure. AI responses follow the same accessibility rules as hand-written content and undergo post-generation filtering for clarity and tone.

## Enforcement Mechanisms

### Design System Enforcement

- UI primitives must pass accessibility checks before use
- Shared components encode accessible defaults (focus rings, aria labels)
- No custom UI allowed without review

### Automated Checks (Required)

- Linting for common a11y issues
- Lighthouse/axe checks in CI (at least on critical flows)
- Visual regression checks for contrast where feasible

### Manual Validation

- Keyboard-only walkthrough for each pilot
- Screen-reader smoke test (NVDA/VoiceOver)
- Content review for tone and clarity

### Pilot Acceptance Criteria

A pilot cannot launch unless onboarding is keyboard navigable, daily tip flow is readable by screen reader, messaging works without a mouse, and AI responses meet clarity and tone standards. Accessibility bugs affecting core flows are P0.

## Consequences

- Slower UI experimentation (intentionally)
- Higher initial bar for contributors
- Much lower pilot rejection risk
- Stronger equity narrative with districts

## Follow-ups / Implementation Tasks

- Create ACCESSIBILITY.md with standards + examples
- Add accessibility checklist to PR template
- Audit shared components for WCAG compliance
- Add reduced-motion support globally
- Train AI prompt templates on plain-language constraints
