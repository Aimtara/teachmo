/* eslint-env node */
import { query } from '../db.js';
import {
  WeeklyBriefSchema,
  DailyPlanSchema,
  DigestItemSchema,
  OrchestratorStateSchema,
  OrchestratorSignalSchema,
  OrchestratorActionSchema,
} from './types.js';
import { makeId } from './utils.js';
import type {
  ActionStatus,
  DailyPlan,
  DigestItem,
  OrchestratorAction,
  OrchestratorSignal,
  OrchestratorState,
  WeeklyBrief,
} from './types.js';

type DigestStatusFilter = 'queued' | 'delivered' | 'dismissed' | 'all';
type ActionStatusFilter = ActionStatus | 'all';

interface PageOptions {
  limit?: number;
  offset?: number;
}

interface ListSignalsOptions extends PageOptions {
  sinceIso?: string | null;
}

interface ListDigestOptions extends PageOptions {
  status?: DigestStatusFilter;
}

interface ListActionOptions extends PageOptions {
  status?: ActionStatusFilter;
}

interface ListTraceOptions extends PageOptions {
  triggerType?: string | null;
}

interface JsonRow {
  [key: string]: unknown;
}

interface SignalJsonRow extends JsonRow {
  signal_json: unknown;
}

interface BriefJsonRow extends JsonRow {
  brief_json: unknown;
}

interface PlanJsonRow extends JsonRow {
  plan_json: unknown;
}

interface StateJsonRow extends JsonRow {
  state_json: unknown;
}

interface DigestItemRow {
  id: unknown;
  family_id: unknown;
  created_at: unknown;
  signal_type: unknown;
  title: unknown;
  summary: unknown;
  urgency: unknown;
  impact: unknown;
  status: unknown;
  meta: unknown;
}

interface DecisionTraceRow {
  id: unknown;
  created_at: unknown;
  trigger_type: unknown;
  trigger_id: unknown;
  suppressed_reason: unknown;
  chosen_action_id: unknown;
  zone: unknown;
  tension: unknown;
  slack: unknown;
  trace_json: unknown;
}

interface ActionRow {
  action_json: unknown;
  status: unknown;
  updated_at: unknown;
}

export interface InsertSignalResult {
  inserted: boolean;
  signal: OrchestratorSignal;
}

export interface ActionQueueResult {
  action: OrchestratorAction;
  status: string;
  updatedAt: string;
}

export interface DecisionTraceResult {
  id: unknown;
  createdAt: string;
  triggerType: unknown;
  triggerId: unknown;
  suppressedReason: unknown;
  chosenActionId: unknown;
  zone: unknown;
  tension: number | null;
  slack: number | null;
  trace: unknown;
}

function toIso(value: unknown): string {
  return new Date(value as string | number | Date).toISOString();
}

function parseDigestRow(r: DigestItemRow): DigestItem {
  return DigestItemSchema.parse({
    id: r.id,
    familyId: r.family_id,
    createdAt: toIso(r.created_at),
    signalType: r.signal_type,
    title: r.title,
    summary: r.summary,
    urgency: Number(r.urgency),
    impact: Number(r.impact),
    status: r.status,
    meta: r.meta ?? {},
  });
}

function parseActionRow(r: ActionRow): ActionQueueResult {
  return {
    action: OrchestratorActionSchema.parse(r.action_json),
    status: String(r.status),
    updatedAt: toIso(r.updated_at),
  };
}

function parseDecisionTraceRow(r: DecisionTraceRow): DecisionTraceResult {
  return {
    id: r.id,
    createdAt: toIso(r.created_at),
    triggerType: r.trigger_type,
    triggerId: r.trigger_id,
    suppressedReason: r.suppressed_reason,
    chosenActionId: r.chosen_action_id,
    zone: r.zone,
    tension: r.tension != null ? Number(r.tension) : null,
    slack: r.slack != null ? Number(r.slack) : null,
    trace: r.trace_json,
  };
}

export class OrchestratorPgStore {
  async insertWeeklyBrief(brief: unknown): Promise<WeeklyBrief> {
    const b = WeeklyBriefSchema.parse(brief);

    await query(
      `
      INSERT INTO orchestrator_weekly_briefs
        (id, family_id, created_at, week_start, week_end, current_zone, tension, slack, cooldown_active, brief_json)
      VALUES
        ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9, $10::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        family_id = EXCLUDED.family_id,
        created_at = EXCLUDED.created_at,
        week_start = EXCLUDED.week_start,
        week_end = EXCLUDED.week_end,
        current_zone = EXCLUDED.current_zone,
        tension = EXCLUDED.tension,
        slack = EXCLUDED.slack,
        cooldown_active = EXCLUDED.cooldown_active,
        brief_json = EXCLUDED.brief_json
      `,
      [
        b.id,
        b.familyId,
        b.createdAt,
        b.weekStart,
        b.weekEnd,
        b.zoneSummary.currentZone,
        b.zoneSummary.tension,
        b.zoneSummary.slack,
        b.zoneSummary.cooldownActive,
        JSON.stringify(b),
      ],
    );

    return b;
  }

  async insertSignalIdempotent(signal: unknown): Promise<InsertSignalResult> {
    const s = OrchestratorSignalSchema.parse(signal);

    const occurredAt = s.timestamp ? s.timestamp : new Date().toISOString();
    const id = s.id || makeId('sig');

    const idem =
      s.idempotencyKey ??
      (typeof s.payload?.idempotencyKey === 'string' ? s.payload.idempotencyKey : null) ??
      null;

    const res = await query<SignalJsonRow>(
      `
      INSERT INTO orchestrator_signals
        (id, family_id, child_id, source, type, occurred_at, idempotency_key, features_json, payload_json, signal_json)
      VALUES
        ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8::jsonb, $9::jsonb, $10::jsonb)
      ON CONFLICT (family_id, idempotency_key) DO NOTHING
      RETURNING signal_json
      `,
      [
        id,
        s.familyId,
        s.childId ?? null,
        s.source,
        s.type,
        occurredAt,
        idem,
        JSON.stringify(s.features ?? null),
        JSON.stringify(s.payload ?? null),
        JSON.stringify({ ...s, id, idempotencyKey: idem, timestamp: occurredAt }),
      ],
    );

    if (res.rowCount === 1) {
      return { inserted: true, signal: OrchestratorSignalSchema.parse(res.rows[0].signal_json) };
    }

    if (idem) {
      const existing = await query<SignalJsonRow>(
        `
        SELECT signal_json
        FROM orchestrator_signals
        WHERE family_id = $1 AND idempotency_key = $2
        ORDER BY occurred_at DESC
        LIMIT 1
        `,
        [s.familyId, idem],
      );

      if (existing.rowCount === 1) {
        return { inserted: false, signal: OrchestratorSignalSchema.parse(existing.rows[0].signal_json) };
      }
    }

    return { inserted: false, signal: OrchestratorSignalSchema.parse({ ...s, id, idempotencyKey: idem, timestamp: occurredAt }) };
  }

  async listSignals(familyId: string, { sinceIso = null, limit = 200, offset = 0 }: ListSignalsOptions = {}): Promise<OrchestratorSignal[]> {
    const params: unknown[] = [familyId];
    let where = `WHERE family_id = $1`;

    if (sinceIso) {
      params.push(sinceIso);
      where += ` AND occurred_at >= $${params.length}::timestamptz`;
    }

    params.push(limit);
    params.push(offset);

    const res = await query<SignalJsonRow>(
      `
      SELECT signal_json
      FROM orchestrator_signals
      ${where}
      ORDER BY occurred_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    return res.rows.map((r) => OrchestratorSignalSchema.parse(r.signal_json));
  }

  async listWeeklyBriefs(familyId: string, { limit = 10, offset = 0 }: PageOptions = {}): Promise<WeeklyBrief[]> {
    const res = await query<BriefJsonRow>(
      `
      SELECT brief_json
      FROM orchestrator_weekly_briefs
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [familyId, limit, offset],
    );
    return res.rows.map((r) => WeeklyBriefSchema.parse(r.brief_json));
  }

  async getLatestWeeklyBrief(familyId: string): Promise<WeeklyBrief | null> {
    const res = await query<BriefJsonRow>(
      `
      SELECT brief_json
      FROM orchestrator_weekly_briefs
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [familyId],
    );
    if (res.rowCount === 0) return null;
    return WeeklyBriefSchema.parse(res.rows[0].brief_json);
  }

  async insertDailyPlan(plan: unknown): Promise<DailyPlan> {
    const p = DailyPlanSchema.parse(plan);

    await query(
      `
      INSERT INTO orchestrator_daily_plans
        (id, family_id, created_at, window_start, window_end, zone_at_plan_time, attention_budget_min, plan_json)
      VALUES
        ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz, $6, $7, $8::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        family_id = EXCLUDED.family_id,
        created_at = EXCLUDED.created_at,
        window_start = EXCLUDED.window_start,
        window_end = EXCLUDED.window_end,
        zone_at_plan_time = EXCLUDED.zone_at_plan_time,
        attention_budget_min = EXCLUDED.attention_budget_min,
        plan_json = EXCLUDED.plan_json
      `,
      [
        p.id,
        p.familyId,
        p.createdAt,
        p.windowStart,
        p.windowEnd,
        p.zoneAtPlanTime,
        p.attentionBudgetMin,
        JSON.stringify(p),
      ],
    );

    return p;
  }

  async listDailyPlans(familyId: string, { limit = 10, offset = 0 }: PageOptions = {}): Promise<DailyPlan[]> {
    const res = await query<PlanJsonRow>(
      `
      SELECT plan_json
      FROM orchestrator_daily_plans
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [familyId, limit, offset],
    );
    return res.rows.map((r) => DailyPlanSchema.parse(r.plan_json));
  }

  async getLatestDailyPlan(familyId: string): Promise<DailyPlan | null> {
    const res = await query<PlanJsonRow>(
      `
      SELECT plan_json
      FROM orchestrator_daily_plans
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [familyId],
    );
    if (res.rowCount === 0) return null;
    return DailyPlanSchema.parse(res.rows[0].plan_json);
  }

  async insertDigestItem(item: unknown): Promise<DigestItem> {
    const d = DigestItemSchema.parse(item);

    await query(
      `
      INSERT INTO orchestrator_digest_items
        (id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta, delivered_at, dismissed_at)
      VALUES
        ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::timestamptz, $12::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        family_id = EXCLUDED.family_id,
        created_at = EXCLUDED.created_at,
        signal_type = EXCLUDED.signal_type,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        urgency = EXCLUDED.urgency,
        impact = EXCLUDED.impact,
        status = EXCLUDED.status,
        meta = EXCLUDED.meta,
        delivered_at = EXCLUDED.delivered_at,
        dismissed_at = EXCLUDED.dismissed_at
      `,
      [
        d.id,
        d.familyId,
        d.createdAt,
        d.signalType,
        d.title,
        d.summary,
        d.urgency,
        d.impact,
        d.status ?? 'queued',
        JSON.stringify(d.meta ?? {}),
        d.status === 'delivered' ? (d.meta?.deliveredAt ?? null) : null,
        d.status === 'dismissed' ? (d.meta?.dismissedAt ?? null) : null,
      ],
    );

    return d;
  }

  async upsertState(state: unknown): Promise<OrchestratorState> {
    const s = OrchestratorStateSchema.parse(state);

    await query(
      `
      INSERT INTO orchestrator_states
        (family_id, updated_at, zone, tension, slack, cooldown_until, state_json)
      VALUES
        ($1, $2::timestamptz, $3, $4, $5, $6::timestamptz, $7::jsonb)
      ON CONFLICT (family_id) DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        zone = EXCLUDED.zone,
        tension = EXCLUDED.tension,
        slack = EXCLUDED.slack,
        cooldown_until = EXCLUDED.cooldown_until,
        state_json = EXCLUDED.state_json
      `,
      [s.familyId, s.updatedAt, s.zone, s.tension, s.slack, s.cooldownUntil, JSON.stringify(s)],
    );

    return s;
  }

  async getState(familyId: string): Promise<OrchestratorState | null> {
    const res = await query<StateJsonRow>(
      `
      SELECT state_json
      FROM orchestrator_states
      WHERE family_id = $1
      LIMIT 1
      `,
      [familyId],
    );
    if (res.rowCount === 0) return null;
    return OrchestratorStateSchema.parse(res.rows[0].state_json);
  }

  async listDigestItems(familyId: string, { status = 'queued', limit = 50, offset = 0 }: ListDigestOptions = {}): Promise<DigestItem[]> {
    const whereStatus = status === 'all' ? '' : 'AND status = $2';
    const params: unknown[] = status === 'all' ? [familyId, limit, offset] : [familyId, status, limit, offset];

    const sql =
      status === 'all'
        ? `
          SELECT id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta
          FROM orchestrator_digest_items
          WHERE family_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `
        : `
          SELECT id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta
          FROM orchestrator_digest_items
          WHERE family_id = $1 ${whereStatus}
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4
        `;

    const res = await query<DigestItemRow>(sql, params);
    return res.rows.map(parseDigestRow);
  }

  async markDigestDelivered(familyId: string): Promise<DigestItem[]> {
    const res = await query<DigestItemRow>(
      `
      UPDATE orchestrator_digest_items
      SET status = 'delivered', delivered_at = now()
      WHERE family_id = $1 AND status = 'queued'
      RETURNING id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta
      `,
      [familyId],
    );

    return res.rows.map(parseDigestRow);
  }

  async dismissDigestItem(familyId: string, itemId: string): Promise<DigestItem | null> {
    const res = await query<DigestItemRow>(
      `
      UPDATE orchestrator_digest_items
      SET status = 'dismissed', dismissed_at = now()
      WHERE family_id = $1 AND id = $2
      RETURNING id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta
      `,
      [familyId, itemId],
    );
    if (res.rowCount === 0) return null;

    return parseDigestRow(res.rows[0]);
  }

  async insertDecisionTrace({
    familyId,
    triggerType,
    triggerId = null,
    suppressedReason = null,
    chosenActionId = null,
    zone = null,
    tension = null,
    slack = null,
    trace,
  }: {
    familyId: string;
    triggerType: string;
    triggerId?: string | null;
    suppressedReason?: string | null;
    chosenActionId?: string | null;
    zone?: string | null;
    tension?: number | null;
    slack?: number | null;
    trace: unknown;
  }): Promise<void> {
    await query(
      `
      INSERT INTO orchestrator_decision_traces
        (family_id, trigger_type, trigger_id, suppressed_reason, chosen_action_id, zone, tension, slack, trace_json)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [familyId, triggerType, triggerId, suppressedReason, chosenActionId, zone, tension, slack, JSON.stringify(trace)],
    );
  }

  async listDecisionTraces(familyId: string, { limit = 50, offset = 0, triggerType = null }: ListTraceOptions = {}): Promise<DecisionTraceResult[]> {
    const params: unknown[] = [familyId];
    let where = `WHERE family_id = $1`;
    if (triggerType) {
      params.push(triggerType);
      where += ` AND trigger_type = $${params.length}`;
    }
    params.push(limit);
    params.push(offset);

    const res = await query<DecisionTraceRow>(
      `
      SELECT id, created_at, trigger_type, trigger_id, suppressed_reason, chosen_action_id, zone, tension, slack, trace_json
      FROM orchestrator_decision_traces
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    return res.rows.map(parseDecisionTraceRow);
  }

  async getDecisionTrace(familyId: string, traceId: string): Promise<DecisionTraceResult | null> {
    const res = await query<DecisionTraceRow>(
      `
      SELECT id, created_at, trigger_type, trigger_id, suppressed_reason, chosen_action_id, zone, tension, slack, trace_json
      FROM orchestrator_decision_traces
      WHERE family_id = $1 AND id = $2
      LIMIT 1
      `,
      [familyId, traceId],
    );

    if (res.rowCount === 0) return null;
    return parseDecisionTraceRow(res.rows[0]);
  }

  async upsertAction(familyId: string, action: unknown, status: ActionStatus = 'queued'): Promise<ActionQueueResult> {
    const a = OrchestratorActionSchema.parse(action);

    await query(
      `
      INSERT INTO orchestrator_actions
        (id, family_id, created_at, updated_at, status, type, action_json)
      VALUES
        ($1, $2, $3::timestamptz, now(), $4, $5, $6::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        family_id = EXCLUDED.family_id,
        updated_at = now(),
        status = EXCLUDED.status,
        type = EXCLUDED.type,
        action_json = EXCLUDED.action_json
      `,
      [a.id, familyId, a.createdAt, status, a.type, JSON.stringify(a)],
    );

    return { action: a, status, updatedAt: new Date().toISOString() };
  }

  async listActions(familyId: string, { status = 'queued', limit = 50, offset = 0 }: ListActionOptions = {}): Promise<ActionQueueResult[]> {
    const params: unknown[] = [familyId];
    let where = `WHERE family_id = $1`;

    if (status !== 'all') {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const res = await query<ActionRow>(
      `
      SELECT action_json, status, updated_at
      FROM orchestrator_actions
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    return res.rows.map(parseActionRow);
  }

  async completeAction(familyId: string, actionId: string, meta: Record<string, unknown> = {}): Promise<ActionQueueResult | null> {
    const res = await query<ActionRow>(
      `
      UPDATE orchestrator_actions
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE family_id = $1 AND id = $2 AND status = 'queued'
      RETURNING action_json, status, updated_at
      `,
      [familyId, actionId],
    );

    if (res.rowCount === 0) {
      const existing = await query<ActionRow>(
        `
        SELECT action_json, status, updated_at
        FROM orchestrator_actions
        WHERE family_id = $1 AND id = $2
        LIMIT 1
        `,
        [familyId, actionId],
      );
      if (existing.rowCount === 0) return null;

      return parseActionRow(existing.rows[0]);
    }

    await query(
      `
      INSERT INTO orchestrator_action_events (action_id, family_id, event_type, meta)
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [actionId, familyId, 'completed', JSON.stringify(meta)],
    );

    return parseActionRow(res.rows[0]);
  }

  async dismissAction(familyId: string, actionId: string, meta: Record<string, unknown> = {}): Promise<ActionQueueResult | null> {
    const res = await query<ActionRow>(
      `
      UPDATE orchestrator_actions
      SET status = 'dismissed', dismissed_at = now(), updated_at = now()
      WHERE family_id = $1 AND id = $2 AND status = 'queued'
      RETURNING action_json, status, updated_at
      `,
      [familyId, actionId],
    );

    if (res.rowCount === 0) return null;

    await query(
      `
      INSERT INTO orchestrator_action_events (action_id, family_id, event_type, meta)
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [actionId, familyId, 'dismissed', JSON.stringify(meta)],
    );

    return parseActionRow(res.rows[0]);
  }
}

export const orchestratorPgStore = new OrchestratorPgStore();
