import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

/**
 * WorkflowGraphEditor
 * A dependency-free, enterprise-safe “visual” editor for workflow definitions.
 *
 * Why not React Flow?
 * - This repo snapshot does not vendor reactflow in package-lock.
 * - We keep a deterministic build with no new registry fetches.
 *
 * This editor models the graph explicitly via:
 * - start: step id
 * - steps: [{ id, type, config, next?, on_true?, on_false? }]
 */

const STEP_TYPES = [
  { value: 'create_entity', label: 'Create entity' },
  { value: 'update_entity', label: 'Update entity' },
  { value: 'condition', label: 'Condition (branch)' },
  { value: 'notify', label: 'Notify (in-app)' },
  { value: 'noop', label: 'No-op' },
];

const OPS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'ncontains', label: 'Not contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'exists', label: 'Exists' },
];

function normalize(definition) {
  const d = definition && typeof definition === 'object' ? definition : {};
  const steps = Array.isArray(d.steps) ? d.steps : [];
  const normalized = steps
    .map((s, idx) => ({
      id: String(s.id || s.key || `step_${idx + 1}`),
      type: s.type || 'noop',
      config: s.config && typeof s.config === 'object' ? s.config : {},
      next: s.next ?? null,
      on_true: s.on_true ?? null,
      on_false: s.on_false ?? null,
    }))
    .filter((s) => s.id);

  const start = typeof d.start === 'string' ? d.start : normalized[0]?.id || null;
  return { version: 2, start, steps: normalized };
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function FieldMappingEditor({ value, onChange, placeholderKey, placeholderValue }) {
  const rows = useMemo(() => {
    const obj = value && typeof value === 'object' ? value : {};
    return Object.entries(obj).map(([k, v]) => ({ k, v: typeof v === 'string' ? v : JSON.stringify(v) }));
  }, [value]);

  const [draft, setDraft] = useState(rows);

  useEffect(() => setDraft(rows), [rows]);

  const commit = (nextRows) => {
    setDraft(nextRows);
    const out = {};
    for (const r of nextRows) {
      const key = String(r.k || '').trim();
      if (!key) continue;
      out[key] = r.v;
    }
    onChange(out);
  };

  return (
    <div className="space-y-2">
      {draft.map((r, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <Input
            className="sm:col-span-2"
            placeholder={placeholderKey}
            value={r.k}
            onChange={(e) => {
              const next = draft.slice();
              next[idx] = { ...next[idx], k: e.target.value };
              commit(next);
            }}
          />
          <Input
            className="sm:col-span-2"
            placeholder={placeholderValue}
            value={r.v}
            onChange={(e) => {
              const next = draft.slice();
              next[idx] = { ...next[idx], v: e.target.value };
              commit(next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = draft.slice();
              next.splice(idx, 1);
              commit(next);
            }}
          >
            Remove
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={() => commit([...(draft || []), { k: '', v: '' }])}
      >
        Add mapping
      </Button>

      <p className="text-xs text-muted-foreground">
        Tip: use templates like <code>{'{{event_metadata.thread_id}}'}</code> or <code>{'{{actor_user_id}}'}</code>.
      </p>
    </div>
  );
}

export function WorkflowGraphEditor({ definitionJson, onChangeDefinitionJson }) {
  const initialDef = useMemo(() => normalize(safeJsonParse(definitionJson)), [definitionJson]);
  const [model, setModel] = useState(initialDef);

  useEffect(() => {
    setModel(initialDef);
  }, [initialDef.start, initialDef.steps.length]);

  const stepIds = useMemo(() => model.steps.map((s) => s.id), [model.steps]);

  const updateModel = (next) => {
    const normalized = normalize(next);
    setModel(normalized);
    onChangeDefinitionJson(JSON.stringify(normalized, null, 2));
  };

  const addStep = (type) => {
    const idx = model.steps.length + 1;
    const id = `step_${idx}`;
    const step = { id, type, config: {}, next: null, on_true: null, on_false: null };
    if (type === 'condition') {
      step.config = { left: '{{event_name}}', op: 'eq', right: 'some.event' };
    }
    const next = { ...model, steps: [...model.steps, step] };
    if (!next.start) next.start = id;
    updateModel(next);
  };

  const updateStep = (id, patch) => {
    const nextSteps = model.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
    updateModel({ ...model, steps: nextSteps });
  };

  const removeStep = (id) => {
    const nextSteps = model.steps.filter((s) => s.id !== id);
    const next = { ...model, steps: nextSteps };
    if (next.start === id) next.start = nextSteps[0]?.id || null;
    // Clear edges that point to removed step
    next.steps = next.steps.map((s) => ({
      ...s,
      next: s.next === id ? null : s.next,
      on_true: s.on_true === id ? null : s.on_true,
      on_false: s.on_false === id ? null : s.on_false,
    }));
    updateModel(next);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start step</label>
              <Select
                value={model.start || ''}
                onValueChange={(v) => updateModel({ ...model, start: v || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start" />
                </SelectTrigger>
                <SelectContent>
                  {stepIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Add step</label>
              <Select onValueChange={addStep}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose type" />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!model.steps.length && (
            <div className="text-sm text-muted-foreground">No steps yet. Add your first step above.</div>
          )}

          <div className="space-y-4">
            {model.steps.map((s) => (
              <Card key={s.id} className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>
                      {s.id} <span className="text-muted-foreground">· {s.type}</span>
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => removeStep(s.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Step type</label>
                      <Select value={s.type} onValueChange={(v) => updateStep(s.id, { type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {s.type !== 'condition' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Next step</label>
                        <Select value={s.next || ''} onValueChange={(v) => updateStep(s.id, { next: v || null })}>
                          <SelectTrigger>
                            <SelectValue placeholder="(end)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">(end)</SelectItem>
                            {stepIds
                              .filter((id) => id !== s.id)
                              .map((id) => (
                                <SelectItem key={id} value={id}>
                                  {id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {s.type === 'condition' && (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Left</label>
                          <Input
                            value={String(s.config?.left || '')}
                            onChange={(e) => updateStep(s.id, { config: { ...s.config, left: e.target.value } })}
                            placeholder="{{event_metadata.foo}}"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Op</label>
                          <Select
                            value={String(s.config?.op || 'eq')}
                            onValueChange={(v) => updateStep(s.id, { config: { ...s.config, op: v } })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Right</label>
                          <Input
                            value={String(s.config?.right || '')}
                            onChange={(e) => updateStep(s.id, { config: { ...s.config, right: e.target.value } })}
                            placeholder="some.value"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">On true</label>
                          <Select
                            value={s.on_true || ''}
                            onValueChange={(v) => updateStep(s.id, { on_true: v || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="(end)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">(end)</SelectItem>
                              {stepIds
                                .filter((id) => id !== s.id)
                                .map((id) => (
                                  <SelectItem key={id} value={id}>
                                    {id}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">On false</label>
                          <Select
                            value={s.on_false || ''}
                            onValueChange={(v) => updateStep(s.id, { on_false: v || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="(end)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">(end)</SelectItem>
                              {stepIds
                                .filter((id) => id !== s.id)
                                .map((id) => (
                                  <SelectItem key={id} value={id}>
                                    {id}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {s.type === 'create_entity' && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Config (JSON)</label>
                      <Textarea
                        value={JSON.stringify(s.config || {}, null, 2)}
                        onChange={(e) => updateStep(s.id, { config: safeJsonParse(e.target.value) || {} })}
                        rows={6}
                      />
                      <FieldMappingEditor
                        value={s.config?.fields || {}}
                        onChange={(fields) => updateStep(s.id, { config: { ...s.config, fields } })}
                        placeholderKey="field"
                        placeholderValue="value/template"
                      />
                      <p className="text-xs text-muted-foreground">
                        For execution, set <code>entity</code> and <code>fields</code>. Example:{' '}
                        <code>{`{ "entity": "partner_submissions", "fields": { "status": "pending" } }`}</code>
                      </p>
                    </div>
                  )}

                  {s.type === 'update_entity' && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Config (JSON)</label>
                      <Textarea
                        value={JSON.stringify(s.config || {}, null, 2)}
                        onChange={(e) => updateStep(s.id, { config: safeJsonParse(e.target.value) || {} })}
                        rows={6}
                      />
                      <FieldMappingEditor
                        value={s.config?.patch || {}}
                        onChange={(patch) => updateStep(s.id, { config: { ...s.config, patch } })}
                        placeholderKey="field"
                        placeholderValue="value/template"
                      />
                      <p className="text-xs text-muted-foreground">
                        For execution, set <code>entity</code>, <code>id</code>, and <code>patch</code>. Example:{' '}
                        <code>{`{ "entity": "partner_submissions", "id": "{{event_metadata.submission_id}}", "patch": { "status": "approved" } }`}</code>
                      </p>
                    </div>
                  )}

                  {s.type === 'notify' && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium">Config (JSON)</label>
                      <Textarea
                        value={JSON.stringify(s.config || {}, null, 2)}
                        onChange={(e) => updateStep(s.id, { config: safeJsonParse(e.target.value) || {} })}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Notification currently records an analytics event (and can be extended to real in-app notifications).
                      </p>
                    </div>
                  )}

                  {s.type === 'noop' && (
                    <p className="text-xs text-muted-foreground">No-op step. Useful as an explicit branch target.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Definition (preview)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={JSON.stringify(model, null, 2)} readOnly rows={10} />
        </CardContent>
      </Card>
    </div>
  );
}
