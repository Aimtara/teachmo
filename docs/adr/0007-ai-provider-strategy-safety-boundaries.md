# ADR 0007 — AI Provider Strategy, Safety Boundaries & Governance

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Trust/Safety
- **Applies to:** AskTeachmo, recommender, content generation

## Context

Teachmo’s AI is user-facing, child-adjacent, and advisory, placing it in a higher-risk category than generic chatbots. The system must stay helpful under stress, avoid medical/legal authority, support neurodiversity-aware alternatives, be explainable, and survive provider outages and cost changes.

## Decision

Teachmo adopts a multi-provider AI architecture with explicit safety boundaries and explainable intent routing. AI is treated as a recommendation engine, not a decision-maker.

## AI Responsibilities

AI may:

- suggest activities, scripts, and reflection prompts
- summarize content already approved by Teachmo
- route users to Explore surfaces
- reframe parent inputs with empathy
- provide general, non-diagnostic guidance

AI may not:

- diagnose conditions
- provide medical/legal advice
- override school policy
- contact schools or teachers autonomously
- access raw child PII beyond what is necessary for personalization

## Architecture

### Provider Strategy

- Multiple LLM providers supported behind a single interface
- Provider selection based on availability, cost, latency, and policy suitability

### Fallback Behavior

If AI is unavailable, show cached tips, offer Explore browsing, and degrade gracefully (no “AI is broken” dead ends).

## Safety Boundaries

### Prompt Boundaries

- System prompts explicitly state role limits
- No “you should” medical/legal language
- Required disclaimers embedded in tone, not legalese

### Output Filters

- Detect and soften shame language, absolutist advice, and inappropriate authority
- Always offer alternatives (“or try…”) and ND-aware defaults
- Sensory and communication alternatives offered proactively
- Never assume diagnosis; language avoids pathologizing

## Explainability

For AI-driven actions, provide a “Why you’re seeing this” affordance and surface signals (age range, setting, energy level, past saves) without exposing raw prompts.

## Logging & Auditability

For each AI response, log provider used, model version, intent classification, safety flags triggered (if any), and avoid storing raw user text beyond the session unless required.

## Consequences

- Slightly more complex implementation
- Stronger trust posture
- Easier district approval
- Easier provider switching

## Follow-ups

- Implement AI provider abstraction
- Define intent taxonomy
- Add AI response metadata logging
- Add parent-facing explainability UI
