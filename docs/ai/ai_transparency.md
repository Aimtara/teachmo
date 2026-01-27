# AI Transparency at Teachmo

Teachmo is committed to building AI features that are transparent, fair and
aligned with educational best practices. This document explains how we use
AI, what data is involved, and how humans remain in control.

## Model Usage

Teachmo uses large language models to power features such as:

1. **AI Coach** – generates personalized feedback and suggestions for parents
   and teachers based on learning data.
2. **Messaging Suggestions** – offers draft replies and conversation starters
   to improve parent-teacher communication.
3. **Automated Content Moderation** – flags messages and posts for review
   according to community guidelines.

We do not train models on identifiable student data. When prompts include
personal information, we use hashing to pseudonymize sensitive fields before
submitting them to the model.

## Data Flow

1. The client application sends a prompt to the Teachmo backend.
2. The backend logs the request in `ai_usage_logs` with metadata such as
   model name, timestamp and hashed identifiers.
3. The request is forwarded to our model provider with only the necessary
   context. Responses are returned to the client and logged.
4. If the model response triggers moderation rules (e.g., due to sensitive
   content or policy violations), it is placed in the `ai_review_queue` for
   human review before it is displayed.

## Human Oversight

* **AI Review Queue**: A team of district and system administrators
  reviews flagged AI outputs. They can approve or reject content and their
  decisions are recorded along with the reviewer ID and timestamp.
* **Auditability**: Every AI request and its review outcome are recorded.
  Administrators can view aggregated statistics in the AI governance dashboard.

## Transparency & Accountability

* **Public Transparency Center**: Teachmo publishes a public transparency page
  describing our AI systems, data flow and human oversight. Tenants can also
  publish their own transparency briefs.
* **Feature Flags & Opt-Out**: Administrators can enable or disable AI
  features on a per-tenant basis. Families and staff may request opt-outs
  where legally required.

To learn more or report concerns about Teachmo's AI usage, please reach out
to our AI governance team at <ai-governance@teachmo.com>.
