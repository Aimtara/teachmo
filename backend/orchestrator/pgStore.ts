/* eslint-env node */
import { query as rawQuery } from '../db.js';
import {
  WeeklyBriefSchema,
  DailyPlanSchema,
  DigestItemSchema,
  OrchestratorStateSchema,
  OrchestratorSignalSchema,
  OrchestratorActionSchema
} from './types.ts';
import type {
  ActionQueueItem,
  ActionStatus,
  DailyPlan,
  DigestItem,
  OrchestratorAction,
  OrchestratorSignal,
  OrchestratorState,
  OrchestratorZone,
  WeeklyBrief,
} from './types.ts';
import { makeId } from './utils.ts';

interface DbResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  rowCount: number | null;
  rows: Row[];
}

type QueryParam = string | number | boolean | null;

function dbQuery<Row extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: readonly QueryParam[] = []
): Promise<DbResult<Row>> {
  return rawQuery(sql, params) as Promise<DbResult<Row>>;
}

interface SignalJsonRow extends Record<string, unknown> {
  signal_json: unknown;
}

interface BriefJsonRow extends Record<string, unknown> {
  brief_json: unknown;
}

interface PlanJsonRow extends Record<string, unknown> {
  plan_json: unknown;
}

interface DigestItemRow extends Record<string, unknown> {
  id: string;
  family_id: string;
  created_at: string | Date;
  signal_type: unknown;
  title: string;
  summary: string;
  urgency: string | number;
  impact: string | number;
  status: unknown;
  meta: unknown;
}

interface DecisionTraceRow extends Record<string, unknown> {
  id: string | number;
  created_at: string | Date;
  trigger_type: string;
  trigger_id: string | null;
  suppressed_reason: string | null;
  chosen_action_id: string | null;
  zone: OrchestratorZone | null;
  tension: string | number | null;
  slack: string | number | null;
  trace_json: unknown;
}

interface ActionRow extends Record<string, unknown> {
  action_json: unknown;
  status: ActionStatus;
  updated_at: string | Date;
}

interface ListSignalsOptions {
  sinceIso?: string | null;
  limit?: number;
  offset?: number;
}

interface ListOptions {
  limit?: number;
  offset?: number;
}

interface StatusListOptions extends ListOptions {
  status?: ActionStatus | 'all';
}

interface DigestStatusListOptions extends ListOptions {
  status?: DigestItem['status'] | 'all';
}

interface TraceListOptions extends ListOptions {
  triggerType?: string | null;
}

interface DecisionTraceInput {
  familyId: string;
  triggerType: string;
  triggerId?: string | null;
  suppressedReason?: string | null;
  chosenActionId?: string | null;
  zone?: OrchestratorZone | null;
  tension?: number | null;
  slack?: number | null;
  trace: Record<string, unknown>;
}

interface InsertSignalResult {
  inserted: boolean;
  signal: OrchestratorSignal;
}

interface DecisionTrace {
  id: string | number;
  createdAt: string;
  triggerType: string;
  triggerId: string | null;
  suppressedReason: string | null;
  chosenActionId: string | null;
  zone: OrchestratorZone | null;
  tension: number | null;
  slack: number | null;
  trace: unknown;
}

function metaString(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return typeof record[key] === 'string' ? record[key] : null;
}

export class OrchestratorPgStore {
  async insertWeeklyBrief(brief: WeeklyBrief): Promise<WeeklyBrief> {
    const b = WeeklyBriefSchema.parse(brief);

    await dbQuery(
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
        JSON.stringify(b)
      ]
    );

    return b;
  }

  /**
   * Insert a signal with idempotency protection.
   * Returns { inserted: boolean, signal }.
   */
  async insertSignalIdempotent(signal: OrchestratorSignal): Promise<InsertSignalResult> {
    const s = OrchestratorSignalSchema.parse(signal);

    const occurredAt = s.timestamp ? s.timestamp : new Date().toISOString();
    const id = s.id || makeId('sig');

    const idem =
      s.idempotencyKey ??
      (typeof s.payload?.idempotencyKey === 'string' ? s.payload.idempotencyKey : null) ??
      null;

    const res = await dbQuery<SignalJsonRow>(
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
        JSON.stringify({ ...s, id, idempotencyKey: idem, timestamp: occurredAt })
      ]
    );

    if (res.rowCount === 1) {
      return { inserted: true, signal: OrchestratorSignalSchema.parse(res.rows[0].signal_json) };
    }

    if (idem) {
      const existing = await dbQuery<SignalJsonRow>(
        `
        SELECT signal_json
        FROM orchestrator_signals
        WHERE family_id = $1 AND idempotency_key = $2
        ORDER BY occurred_at DESC
        LIMIT 1
        `,
        [s.familyId, idem]
      );

      if (existing.rowCount === 1) {
        return { inserted: false, signal: OrchestratorSignalSchema.parse(existing.rows[0].signal_json) };
      }
    }

    return {
      inserted: false,
      signal: OrchestratorSignalSchema.parse({
        ...s,
        id,
        ...(idem ? { idempotencyKey: idem } : {}),
        timestamp: occurredAt
      })
    };
  }

  async listSignals(
    familyId: string,
    { sinceIso = null, limit = 200, offset = 0 }: ListSignalsOptions = {}
  ): Promise<OrchestratorSignal[]> {
    const params: QueryParam[] = [familyId];
    let where = `WHERE family_id = $1`;

    if (sinceIso) {
      params.push(sinceIso);
      where += ` AND occurred_at >= $${params.length}::timestamptz`;
    }

    params.push(limit);
    params.push(offset);

    const res = await dbQuery<SignalJsonRow>(
      `
      SELECT signal_json
      FROM orchestrator_signals
      ${where}
      ORDER BY occurred_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    return res.rows.map((r) => OrchestratorSignalSchema.parse(r.signal_json));
  }

  async listWeeklyBriefs(familyId: string, { limit = 10, offset = 0 }: ListOptions = {}): Promise<WeeklyBrief[]> {
    const res = await dbQuery<BriefJsonRow>(
      `
      SELECT brief_json
      FROM orchestrator_weekly_briefs
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [familyId, limit, offset]
    );
    return res.rows.map((r) => WeeklyBriefSchema.parse(r.brief_json));
  }

  async getLatestWeeklyBrief(familyId: string): Promise<WeeklyBrief | null> {
    const res = await dbQuery<BriefJsonRow>(
      `
      SELECT brief_json
      FROM orchestrator_weekly_briefs
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [familyId]
    );
    if (res.rowCount === 0) return null;
    return WeeklyBriefSchema.parse(res.rows[0].brief_json);
  }

  async insertDailyPlan(plan: DailyPlan): Promise<DailyPlan> {
    const p = DailyPlanSchema.parse(plan);

    await dbQuery(
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
        JSON.stringify(p)
      ]
    );

    return p;
  }

  async listDailyPlans(familyId: string, { limit = 10, offset = 0 }: ListOptions = {}): Promise<DailyPlan[]> {
    const res = await dbQuery<PlanJsonRow>(
      `
      SELECT plan_json
      FROM orchestrator_daily_plans
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [familyId, limit, offset]
    );
    return res.rows.map((r) => DailyPlanSchema.parse(r.plan_json));
  }

  async getLatestDailyPlan(familyId: string): Promise<DailyPlan | null> {
    const res = await dbQuery<PlanJsonRow>(
      `
      SELECT plan_json
      FROM orchestrator_daily_plans
      WHERE family_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [familyId]
    );
    if (res.rowCount === 0) return null;
    return DailyPlanSchema.parse(res.rows[0].plan_json);
  }

  async insertDigestItem(item: DigestItem): Promise<DigestItem> {
    const d = DigestItemSchema.parse(item);

    await dbQuery(
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
        d.status === 'delivered' ? metaString(d.meta, 'deliveredAt') : null,
        d.status === 'dismissed' ? metaString(d.meta, 'dismissedAt') : null
      ]
    );

    return d;
  }

  async upsertState(state: OrchestratorState): Promise<OrchestratorState> {
    const s = OrchestratorStateSchema.parse(state);

    await dbQuery(
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
      [
        s.familyId,
        s.updatedAt,
        s.zone,
        s.tension,
        s.slack,
        s.cooldownUntil,
        JSON.stringify(s)
      ]
    );

    return s;
  }

  async getState(familyId: string): Promise<OrchestratorState | null> {
    const res = await dbQuery<Record<string, unknown>>(
      `
      SELECT state_json
      FROM orchestrator_states
      WHERE family_id = $1
      LIMIT 1
      `,
      [familyId]
    );
    if (res.rowCount === 0) return null;
    return OrchestratorStateSchema.parse(res.rows[0].state_json);
  }

  async listDigestItems(
    familyId: string,
    { status = 'queued', limit = 50, offset = 0 }: DigestStatusListOptions = {}
  ): Promise<DigestItem[]> {
    const whereStatus = status === 'all' ? '' : 'AND status = $2';
    const params: QueryParam[] = status === 'all' ? [familyId, limit, offset] : [familyId, status, limit, offset];

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

    const res = await dbQuery<DigestItemRow>(sql, params);
    return res.rows.map((r) =>
      DigestItemSchema.parse({
        id: r.id,
        familyId: r.family_id,
        createdAt: new Date(r.created_at).toISOString(),
        signalType: r.signal_type,
        title: r.title,
        summary: r.summary,
        urgency: Number(r.urgency),
        impact: Number(r.impact),
        status: r.status,
        meta: r.meta ?? {}
      })
    );
  }

  async markDigestDelivered(familyId: string): Promise<DigestItem[]> {
    const res = await dbQuery<DigestItemRow>(
      `
      UPDATE orchestrator_digest_items
      SET status = 'delivered', delivered_at = now()
      WHERE family_id = $1 AND status = 'queued'
      RETURNING id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta
      `,
      [familyId]
    );

    return res.rows.map((r) =>
      DigestItemSchema.parse({
        id: r.id,
        familyId: r.family_id,
        createdAt: new Date(r.created_at).toISOString(),
        signalType: r.signal_type,
        title: r.title,
        summary: r.summary,
        urgency: Number(r.urgency),
        impact: Number(r.impact),
        status: r.status,
        meta: r.meta ?? {}
      })
    );
  }

  async dismissDigestItem(familyId: string, itemId: string): Promise<DigestItem | null> {
    const res = await dbQuery<DigestItemRow>(
      `
      UPDATE orchestrator_digest_items
      SET status = 'dismissed', dismissed_at = now()
      WHERE family_id = $1 AND id = $2
      RETURNING id, family_id, created_at, signal_type, title, summary, urgency, impact, status, meta
      `,
      [familyId, itemId]
    );
    if (res.rowCount === 0) return null;

    const r = res.rows[0];
    return DigestItemSchema.parse({
      id: r.id,
      familyId: r.family_id,
      createdAt: new Date(r.created_at).toISOString(),
      signalType: r.signal_type,
      title: r.title,
      summary: r.summary,
      urgency: Number(r.urgency),
      impact: Number(r.impact),
      status: r.status,
      meta: r.meta ?? {}
    });
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
    trace
  }: DecisionTraceInput): Promise<void> {
    await dbQuery(
      `
      INSERT INTO orchestrator_decision_traces
        (family_id, trigger_type, trigger_id, suppressed_reason, chosen_action_id, zone, tension, slack, trace_json)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        familyId,
        triggerType,
        triggerId,
        suppressedReason,
        chosenActionId,
        zone,
        tension,
        slack,
        JSON.stringify(trace)
      ]
    );
  }

  async listDecisionTraces(
    familyId: string,
    { limit = 50, offset = 0, triggerType = null }: TraceListOptions = {}
  ): Promise<DecisionTrace[]> {
    const params: QueryParam[] = [familyId];
    let where = `WHERE family_id = $1`;
    if (triggerType) {
      params.push(triggerType);
      where += ` AND trigger_type = $${params.length}`;
    }
    params.push(limit);
    params.push(offset);

    const res = await dbQuery<DecisionTraceRow>(
      `
      SELECT id, created_at, trigger_type, trigger_id, suppressed_reason, chosen_action_id, zone, tension, slack, trace_json
      FROM orchestrator_decision_traces
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    return res.rows.map((r) => ({
      id: r.id,
      createdAt: new Date(r.created_at).toISOString(),
      triggerType: r.trigger_type,
      triggerId: r.trigger_id,
      suppressedReason: r.suppressed_reason,
      chosenActionId: r.chosen_action_id,
      zone: r.zone,
      tension: r.tension != null ? Number(r.tension) : null,
      slack: r.slack != null ? Number(r.slack) : null,
      trace: r.trace_json
    }));
  }

  async getDecisionTrace(familyId: string, traceId: number): Promise<DecisionTrace | null> {
    const res = await dbQuery<DecisionTraceRow>(
      `
      SELECT id, created_at, trigger_type, trigger_id, suppressed_reason, chosen_action_id, zone, tension, slack, trace_json
      FROM orchestrator_decision_traces
      WHERE family_id = $1 AND id = $2
      LIMIT 1
      `,
      [familyId, traceId]
    );

    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      createdAt: new Date(r.created_at).toISOString(),
      triggerType: r.trigger_type,
      triggerId: r.trigger_id,
      suppressedReason: r.suppressed_reason,
      chosenActionId: r.chosen_action_id,
      zone: r.zone,
      tension: r.tension != null ? Number(r.tension) : null,
      slack: r.slack != null ? Number(r.slack) : null,
      trace: r.trace_json
    };
  }

  async upsertAction(
    familyId: string,
    action: OrchestratorAction,
    status: ActionStatus = 'queued'
  ): Promise<ActionQueueItem> {
    const a = OrchestratorActionSchema.parse(action);

    await dbQuery(
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
      [a.id, familyId, a.createdAt, status, a.type, JSON.stringify(a)]
    );

    return { action: a, status, updatedAt: new Date().toISOString() };
  }

  async listActions(
    familyId: string,
    { status = 'queued', limit = 50, offset = 0 }: StatusListOptions = {}
  ): Promise<ActionQueueItem[]> {
    const params: QueryParam[] = [familyId];
    let where = `WHERE family_id = $1`;

    if (status !== 'all') {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const res = await dbQuery<ActionRow>(
      `
      SELECT action_json, status, updated_at
      FROM orchestrator_actions
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    return res.rows.map((r) => ({
      action: OrchestratorActionSchema.parse(r.action_json),
      status: r.status,
      updatedAt: new Date(r.updated_at).toISOString()
    }));
  }

  async completeAction(
    familyId: string,
    actionId: string,
    meta: Record<string, unknown> = {}
  ): Promise<ActionQueueItem | null> {
    const res = await dbQuery<ActionRow>(
      `
      UPDATE orchestrator_actions
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE family_id = $1 AND id = $2 AND status = 'queued'
      RETURNING action_json, status, updated_at
      `,
      [familyId, actionId]
    );

    if (res.rowCount === 0) {
      const existing = await dbQuery<ActionRow>(
        `
        SELECT action_json, status, updated_at
        FROM orchestrator_actions
        WHERE family_id = $1 AND id = $2
        LIMIT 1
        `,
        [familyId, actionId]
      );
      if (existing.rowCount === 0) return null;

      return {
        action: OrchestratorActionSchema.parse(existing.rows[0].action_json),
        status: existing.rows[0].status,
        updatedAt: new Date(existing.rows[0].updated_at).toISOString()
      };
    }

    await dbQuery(
      `
      INSERT INTO orchestrator_action_events (action_id, family_id, event_type, meta)
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [actionId, familyId, 'completed', JSON.stringify(meta)]
    );

    return {
      action: OrchestratorActionSchema.parse(res.rows[0].action_json),
      status: res.rows[0].status,
      updatedAt: new Date(res.rows[0].updated_at).toISOString()
    };
  }

  async dismissAction(
    familyId: string,
    actionId: string,
    meta: Record<string, unknown> = {}
  ): Promise<ActionQueueItem | null> {
    const res = await dbQuery<ActionRow>(
      `
      UPDATE orchestrator_actions
      SET status = 'dismissed', dismissed_at = now(), updated_at = now()
      WHERE family_id = $1 AND id = $2 AND status = 'queued'
      RETURNING action_json, status, updated_at
      `,
      [familyId, actionId]
    );

    if (res.rowCount === 0) return null;

    await dbQuery(
      `
      INSERT INTO orchestrator_action_events (action_id, family_id, event_type, meta)
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [actionId, familyId, 'dismissed', JSON.stringify(meta)]
    );

    return {
      action: OrchestratorActionSchema.parse(res.rows[0].action_json),
      status: res.rows[0].status,
      updatedAt: new Date(res.rows[0].updated_at).toISOString()
    };
  }
}

export const orchestratorPgStore = new OrchestratorPgStore();
