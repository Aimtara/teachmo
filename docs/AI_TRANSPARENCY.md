# Teachmo AI Transparency

## AI Purpose & Ethical Framework
Teachmo uses AI to reduce administrative burden, surface insights, and support learning outcomes. AI outputs are advisory and must not replace professional judgment.

Guiding principles:
- **Transparency**: clearly describe where AI is used.
- **Human oversight**: humans review high-impact decisions.
- **Fairness**: monitor bias and disparate impact.
- **Privacy**: minimize data exposure and apply anonymization.

## Data Flow Diagram (Narrative)
1. **Inputs**: user prompts, operational context, and approved datasets.
2. **Model**: dynamic model selection based on risk and workload.
3. **Review Queue**: flagged outputs are routed for human review.
4. **User Delivery**: approved content is delivered with audit logging.

## Human-in-the-Loop Moderation
- Flagged AI outputs enter the review queue.
- Reviewers can approve, reject, or request changes.
- Decisions are logged with reviewer identity and timestamps.

## Bias Detection Methodology
Teachmo applies a two-stage approach:
- **Statistical checks**: monitor distributions and outcome parity.
- **Qualitative review**: sampled outputs reviewed by educators.

## Model Provenance & Dynamic Selection
- Models are sourced from vetted providers (e.g., OpenAI, Anthropic).
- Model choice is determined by risk level, latency, and cost thresholds.

## Reviewer Accountability
All AI review decisions are stored in `ai_review_queue` and linked to `ai_usage_logs` to create a full audit trail.

## Privacy, Anonymization, and Feedback Loops
- Sensitive identifiers are hashed for logging.
- Feedback from reviewers and users improves future prompts and guardrails.
