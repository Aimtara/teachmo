/* eslint-env node */
import * as models from '../models.js';
import { incrementOrchestratorCounter } from '../metrics.js';

interface AlertRoute {
  id: number;
  name: string;
  channel: string;
  target: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface EscalationPolicy {
  id: number;
  name: string;
  enabled: boolean;
  routes: unknown[];
  rules: unknown[];
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface AlertDelivery extends Record<string, unknown> {
  id: number;
  routeId: number;
  channel: string;
  target: string;
  status: string;
  createdAt: string;
}

interface AlertPayload extends Record<string, unknown> {
  id?: string | number | null;
  name?: string | null;
  channel?: string;
  target?: string | null;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
  routes?: unknown[];
  rules?: unknown[];
  alert?: Record<string, unknown>;
}

const {
  orchestratorAlertRoutes,
  orchestratorEscalationPolicies,
  orchestratorAlertDeliveries,
  nextId
} = models as unknown as {
  orchestratorAlertRoutes: AlertRoute[];
  orchestratorEscalationPolicies: EscalationPolicy[];
  orchestratorAlertDeliveries: AlertDelivery[];
  nextId: (name: string) => number;
};

const nowIso = () => new Date().toISOString();

export function listAlertRoutes(): AlertRoute[] {
  return orchestratorAlertRoutes;
}

export function upsertAlertRoute(payload: AlertPayload) {
  const {
    id = null,
    name = null,
    channel = 'webhook',
    target = null,
    enabled = true,
    metadata = {}
  } = payload || {};

  if (!target) {
    return { error: 'missing_target' };
  }

  const existing = id ? orchestratorAlertRoutes.find((route) => route.id === Number(id)) : null;
  if (existing) {
    existing.name = name ?? existing.name;
    existing.channel = channel || existing.channel;
    existing.target = target || existing.target;
    existing.enabled = enabled !== undefined ? Boolean(enabled) : existing.enabled;
    existing.metadata = metadata ?? existing.metadata;
    existing.updatedAt = nowIso();
    incrementOrchestratorCounter('alertRouteUpserts');
    return { route: existing };
  }

  const route = {
    id: nextId('orchestratorAlertRoute'),
    name: name || `Route ${orchestratorAlertRoutes.length + 1}`,
    channel,
    target,
    enabled: Boolean(enabled),
    metadata: metadata ?? {},
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  orchestratorAlertRoutes.push(route);
  incrementOrchestratorCounter('alertRouteUpserts');
  return { route };
}

export function testAlertRoute(routeId: string | number, payload: Record<string, unknown> = {}) {
  const route = orchestratorAlertRoutes.find((r) => r.id === Number(routeId));
  if (!route) return { error: 'route_not_found' };

  const status = route.enabled ? 'sent' : 'skipped';
  const delivery = {
    id: nextId('orchestratorAlertDelivery'),
    routeId: route.id,
    channel: route.channel,
    target: route.target,
    status,
    createdAt: nowIso(),
    payload: payload || {},
    response: status === 'sent' ? { ok: true } : { ok: false, reason: 'route_disabled' }
  };
  orchestratorAlertDeliveries.push(delivery);
  incrementOrchestratorCounter('alertRouteTests');
  incrementOrchestratorCounter('alertDeliveries');

  return { route, delivery };
}

export function listEscalationPolicies(): EscalationPolicy[] {
  return orchestratorEscalationPolicies;
}

export function upsertEscalationPolicy(payload: AlertPayload) {
  const { id = null, name = null, enabled = true, routes = [], rules = [], metadata = {} } = payload || {};

  const existing = id ? orchestratorEscalationPolicies.find((policy) => policy.id === Number(id)) : null;
  if (existing) {
    existing.name = name ?? existing.name;
    existing.enabled = enabled !== undefined ? Boolean(enabled) : existing.enabled;
    existing.routes = Array.isArray(routes) ? routes : existing.routes;
    existing.rules = Array.isArray(rules) ? rules : existing.rules;
    existing.metadata = metadata ?? existing.metadata;
    existing.updatedAt = nowIso();
    incrementOrchestratorCounter('escalationPolicyUpserts');
    return { policy: existing };
  }

  const policy = {
    id: nextId('orchestratorEscalationPolicy'),
    name: name || `Policy ${orchestratorEscalationPolicies.length + 1}`,
    enabled: Boolean(enabled),
    routes: Array.isArray(routes) ? routes : [],
    rules: Array.isArray(rules) ? rules : [],
    metadata: metadata ?? {},
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  orchestratorEscalationPolicies.push(policy);
  incrementOrchestratorCounter('escalationPolicyUpserts');
  return { policy };
}

export function checkEscalations({ alert = {} }: { alert?: Record<string, unknown> } = {}) {
  const activePolicies = orchestratorEscalationPolicies.filter((policy) => policy.enabled);
  const deliveries: AlertDelivery[] = [];

  activePolicies.forEach((policy) => {
    const routeIds = policy.routes?.length ? policy.routes : orchestratorAlertRoutes.map((route) => route.id);
    routeIds.forEach((routeId) => {
      const route = orchestratorAlertRoutes.find((r) => r.id === Number(routeId));
      if (!route) return;
      const status = route.enabled ? 'sent' : 'skipped';
      deliveries.push({
        id: nextId('orchestratorAlertDelivery'),
        routeId: route.id,
        policyId: policy.id,
        channel: route.channel,
        target: route.target,
        status,
        createdAt: nowIso(),
        payload: { alert, policy: policy.name },
        response: status === 'sent' ? { ok: true } : { ok: false, reason: 'route_disabled' }
      });
    });
  });

  deliveries.forEach((delivery) => {
    orchestratorAlertDeliveries.push(delivery);
  });

  if (deliveries.length) {
    incrementOrchestratorCounter('alertDeliveries', deliveries.length);
  }
  incrementOrchestratorCounter('escalationChecks');

  return { policies: activePolicies, deliveries };
}
