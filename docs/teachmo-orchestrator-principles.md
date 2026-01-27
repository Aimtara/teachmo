# Teachmo Orchestrator Principles

## What the orchestrator is

Teachmo Orchestrator is the always-on “reflex + governance” layer that turns messy inputs (school signals, parent actions, teacher comms, integrations) into safe, right-sized, timely outputs (nudges, summaries, alerts, workflow steps) across channels—without spamming, leaking data, or creating teacher burden.

## Mental models

- **Golgi tendon reflex → safety before strength.** When load spikes, the body inhibits before it tears. The orchestrator must inhibit (throttle, cool down, suppress duplicates) before it “helps harder.”
- **Bilateral integration → two hemispheres + productive tension.** The “parent hemisphere” optimizes emotional/cognitive load; the “teacher hemisphere” optimizes time, boundaries, and compliance. The orchestrator arbitrates—no single brain dominates.

## Principles

1. **Safety is a feature, not a ticket.**
   - If the system can’t be trusted, nothing else matters.
   - **Implication:** deny-by-default auth, least privilege, and “no silent failures.”

2. **Every output must have a provenance.**
   - Parents should be able to ask: “Why did I get this?”
   - **Implication:** event lineage (inputs → transforms → decision → output), with auditability.

3. **Reflexes beat reasoning under pressure.**
   - Real families don’t have time for “maybe.”
   - **Implication:** deterministic guardrails (cooldowns, dedupe, severity routing) run before any LLM creativity.

4. **Inhibit early, recover gracefully.**
   - Golgi tendon rule: suppress before damage.
   - **Implication:** auto-mitigations (temporary throttle raise, cooldown extension, channel fallback) + one-click “force clear mitigation” in Ops UI.

5. **Parent cognitive load is a first-class metric.**
   - Reduce complexity, don’t repackage it.
   - **Implication:** default to summaries; a single daily/weekly brief is often better than 20 notifications.

6. **Two hemispheres, one contract.**
   - Parent hemisphere: clarity, emotional tone, actionability.
   - Teacher hemisphere: boundaries, minimal burden, policy compliance.
   - **Implication:** explicit “teacher burden budget” and “parent load budget” as constraints in decisioning.

7. **Never surprise users with sensitive access.**
   - Especially child data.
   - **Implication:** verified guardianship, scoped data views (a parent can only read their child), and visible consent gates.

8. **Quiet systems are operable systems.**
   - If ops only knows something is wrong from Twitter, you’re cooked.
   - **Implication:** health endpoints + rolling aggregates + alert hooks + delivery receipts.

9. **Design for multi-tenant reality.**
   - A pilot is not production.
   - **Implication:** tenant isolation in data model, policies, rate limits, and analytics partitions.

10. **Channels are interchangeable; intent is not.**
    - SMS, email, push, and in-app are delivery mechanisms; the “why” is the product.
    - **Implication:** channel policy layer (severity → routing) and per-family preferences.

11. **Human override is sacred.**
    - Parents and admins must be able to override automation.
    - **Implication:** “snooze,” “mute category,” “escalate,” and ops controls to test endpoints / clear mitigations.

12. **Warmth without deception.**
    - Teachmo voice: wise friend, non-judgy, tiny scripts.
    - **Implication:** the orchestrator never invents facts; it labels uncertainty and points to sources.
