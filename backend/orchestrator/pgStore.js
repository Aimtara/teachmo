/* eslint-env node */
import { query } from '../db.js';
import {
  WeeklyBriefSchema,
  DailyPlanSchema,
  DigestItemSchema,
  OrchestratorStateSchema,
  OrchestratorSignalSchema
} from './types.js';
import { makeId } from './utils.js';

export class OrchestratorPgStore {
  async insertWeeklyBrief(brief) {
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
        JSON.stringify(b)
      ]
    );

    return b;
  }

  async insertSignal(signal) {
    const s = OrchestratorSignalSchema.parse(signal);

    const id = s.id || makeId('sig');
    const occurredAt = s.timestamp ? s.timestamp : new Date().toISOString();

    await query(
      `
      INSERT INTO orchestrator_signals
        (id, family_id, child_id, source, type, occurred_at, features_json, payload_json, signal_json)
      VALUES
        ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb, $8::jsonb, $9::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        family_id = EXCLUDED.family_id,
        child_id = EXCLUDED.child_id,
        source = EXCLUDED.source,
        type = EXCLUDED.type,
        occurred_at = EXCLUDED.occurred_at,
        features_json = EXCLUDED.features_json,
        payload_json = EXCLUDED.payload_json,
        signal_json = EXCLUDED.signal_json
      `,
      [
        id,
        s.familyId,
        s.childId ?? null,
        s.source,
        s.type,
        occurredAt,
        JSON.stringify(s.features ?? null),
        JSON.stringify(s.payload ?? null),
        JSON.stringify({ ...s, id, timestamp: occurredAt })
      ]
    );

    return { ...s, id, timestamp: occurredAt };
  }

  async listSignals(familyId, { sinceIso = null, limit = 200, offset = 0 } = {}) {
    const params = [familyId];
    let where = `WHERE family_id = $1`;

    if (sinceIso) {
      params.push(sinceIso);
      where += ` AND occurred_at >= $${params.length}::timestamptz`;
    }

    params.push(limit);
    params.push(offset);

    const res = await query(
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

  async listWeeklyBriefs(familyId, { limit = 10, offset = 0 } = {}) {
    const res = await query(
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

  async getLatestWeeklyBrief(familyId) {
    const res = await query(
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

  async insertDailyPlan(plan) {
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
        JSON.stringify(p)
      ]
    );

    return p;
  }

  async listDailyPlans(familyId, { limit = 10, offset = 0 } = {}) {
    const res = await query(
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

  async getLatestDailyPlan(familyId) {
    const res = await query(
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

  async insertDigestItem(item) {
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
        d.status === 'delivered' ? d.meta?.deliveredAt ?? null : null,
        d.status === 'dismissed' ? d.meta?.dismissedAt ?? null : null
      ]
    );

    return d;
  }

  async upsertState(state) {
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

  async getState(familyId) {
    const res = await query(
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

  async listDigestItems(familyId, { status = 'queued', limit = 50, offset = 0 } = {}) {
    const whereStatus = status === 'all' ? '' : 'AND status = $2';
    const params = status === 'all' ? [familyId, limit, offset] : [familyId, status, limit, offset];

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

    const res = await query(sql, params);
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

  async markDigestDelivered(familyId) {
    const res = await query(
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

  async dismissDigestItem(familyId, itemId) {
    const res = await query(
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
}

export const orchestratorPgStore = new OrchestratorPgStore();
