import { z } from 'zod';
import { classify } from './orchestrator/classify.js';
import { getHandler } from './orchestrator/registry.js';
import { ARTIFACT_TYPES, ROUTES, SAFETY_LEVELS } from './orchestrator/routes.js';
import { insertOrchestratorArtifact, insertOrchestratorRun } from './orchestrator/persist.js';

// Minimal runtime validation. Keep in sync with src/lib/orchestrator/schemas.ts.
const OrchestratorRequestSchema = z.object({
  requestId: z.string().min(1),
  actor: z.object({ userId: z.string().min(1), role: z.string().min(1) }),
  channel: z.enum(['CHAT', 'PUSH', 'EMAIL', 'UI_ACTION', 'SYSTEM_EVENT']),
  text: z.string().optional(),
  selected: z
    .object({
      childId: z.string().optional(),
      schoolId: z.string().optional(),
      threadId: z.string().optional(),
      recipientUserId: z.string().optional()
    })
    .optional(),
  metadata: z
    .object({
      locale: z.string().optional(),
      timezone: z.string().optional(),
      action: z
        .object({
          id: z.string().optional(),
          payload: z.record(z.any()).optional()
        })
        .optional()
    })
    .optional()
});

function normalizeActorRole(role) {
  // Nhost profile roles in migrations are lowercase strings.
  const r = String(role || '').toLowerCase();
  return ['parent', 'teacher', 'partner', 'system_admin', 'school_admin', 'district_admin'].includes(r)
    ? r
    : 'parent';
}

export default async (req, res) => {
  const start = Date.now();

  try {
    const parsed = OrchestratorRequestSchema.parse(req.body || {});

    const ctx = {
      ...parsed,
      actor: {
        ...parsed.actor,
        role: normalizeActorRole(parsed.actor.role)
      }
    };

    // Deterministic UI_ACTION preprocessing:
    // - choice actions should fill selected fields without requiring "chat interpretation" in the UI.
    // - followup answers can be forwarded to normal text classification server-side.
    const actionId = ctx.metadata?.action?.id ? String(ctx.metadata.action.id) : '';
    if (ctx.channel === 'UI_ACTION' && actionId) {
      const payload = ctx.metadata?.action?.payload || {};

      if (actionId === 'HUB_THREAD_SUMMARIZE_CHOOSE_THREAD') {
        const threadId = payload.threadId || payload.value;
        if (threadId) ctx.selected = { ...ctx.selected, threadId: String(threadId) };
      }

      if (actionId === 'HUB_MESSAGE_SEND_CHOOSE_RECIPIENT') {
        const recipientUserId = payload.recipientUserId || payload.value;
        if (recipientUserId) ctx.selected = { ...ctx.selected, recipientUserId: String(recipientUserId) };
      }

      if (actionId === 'ORCHESTRATOR_FOLLOWUP_ANSWER') {
        const answer = payload.answer;
        if (answer != null) {
          // Convert to a regular chat turn (server-side) so existing intent classification works.
          ctx.channel = 'CHAT';
          ctx.text = String(answer);
          // Remove action metadata to avoid downstream confusion.
          ctx.metadata = { ...(ctx.metadata || {}) };
          delete ctx.metadata.action;
        } else {
          // If no answer provided, degrade gracefully.
          return res.status(400).json({
            route: ROUTES.UNKNOWN_CLARIFY,
            confidence: 0.2,
            safety: { level: 'NONE', reasons: [] },
            ui: { type: 'ERROR', title: 'Missing answer', message: 'No follow-up answer was provided.' }
          });
        }
      }
    }

    const classification = classify({
      text: ctx.text,
      channel: ctx.channel,
      actionId: ctx.metadata?.action?.id
    });
    const handler = getHandler(classification.route);

    // Execute specialist
    const specialistResult = await handler({
      ...ctx,
      text: ctx.text || ''
    });

    const response = {
      route: specialistResult.route || classification.route,
      confidence: Math.max(0, Math.min(1, classification.confidence ?? 0)),
      safety: classification.safety || { level: SAFETY_LEVELS.NONE, reasons: [] },
      ...(specialistResult.needs ? { needs: specialistResult.needs } : {}),
      ui: specialistResult.ui,
      ...(specialistResult.artifact
        ? {
            artifact: {
              type: Object.values(ARTIFACT_TYPES).includes(specialistResult.artifact.type)
                ? specialistResult.artifact.type
                : ARTIFACT_TYPES.OTHER,
              payload: specialistResult.artifact.payload || {},
              expiresAt: specialistResult.artifact.expiresAt
            }
          }
        : {}),
      debug: {
        extractedEntities: classification.extractedEntities || {}
      }
    };

    // Best-effort persistence
    const latencyMs = Date.now() - start;
    const runInsert = await insertOrchestratorRun({
      requestId: ctx.requestId,
      profileId: null, // Phase 1: map userId -> profile_id when auth wiring is ready
      appRole: ctx.actor.role,
      channel: ctx.channel,
      route: response.route,
      confidence: response.confidence,
      safetyLevel: response.safety?.level || SAFETY_LEVELS.NONE,
      missingContext: response.needs?.missing || [],
      extractedEntities: response.debug?.extractedEntities || {},
      success: response.ui?.type !== 'ERROR',
      latencyMs
    });

    if (runInsert?.persisted && runInsert.runId && response.artifact) {
      const a = await insertOrchestratorArtifact({
        runId: runInsert.runId,
        profileId: null,
        artifactType: response.artifact.type,
        payload: response.artifact.payload,
        expiresAt: response.artifact.expiresAt || null
      });
      if (a?.persisted && a.artifactId) {
        response.artifact.id = a.artifactId;
      }
    }

    res.status(200).json(response);
  } catch (err) {
    const latencyMs = Date.now() - start;
    console.error('orchestrate error', err);

    // Best-effort persistence of failure
    try {
      await insertOrchestratorRun({
        requestId: null,
        profileId: null,
        appRole: 'parent',
        channel: 'CHAT',
        route: 'UNKNOWN_CLARIFY',
        confidence: 0,
        safetyLevel: SAFETY_LEVELS.NONE,
        missingContext: [],
        extractedEntities: {},
        success: false,
        latencyMs,
        errorCode: 'ORCHESTRATOR_EXCEPTION',
        errorMessage: String(err?.message || err)
      });
    } catch (_) {
      // ignore
    }

    res.status(200).json({
      route: 'UNKNOWN_CLARIFY',
      confidence: 0,
      safety: { level: 'NONE', reasons: [] },
      ui: { type: 'ERROR', title: 'Orchestrator error', message: 'Something went wrong routing your request.' }
    });
  }
};
