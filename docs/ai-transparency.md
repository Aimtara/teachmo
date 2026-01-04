# AI Transparency

Teachmo uses AI to support educators and caregivers with human oversight. This document summarizes how AI is used, what data is logged, and how human review is enforced.

## Purpose and scope

- **Purpose**: reduce administrative burden, surface insights, and support communication workflows.
- **Scope**: AI assistance is advisory and not used for high-impact decisions without human review.

## Data usage

When AI features are used, Teachmo stores metadata and governance artifacts:

- **Usage logs**: model name, timestamps, status, and metadata for every AI call.
- **Payloads**: prompts and responses are captured in secure audit tables for transparency and review.
- **Tenant context**: each record is scoped to an organization and optional school.

## Human review

Teachmo maintains an AI review queue for items flagged by policy or staff review. Reviewers can approve or reject content, and all decisions are logged.

## Governance policies

Policies are stored in the `ai_policy_docs` table and surfaced on `/ai/transparency`. Organizations can publish tenant-scoped guidance in addition to the global policy.

## Contact

Questions about AI governance can be sent to **ai-governance@teachmo.com**.
