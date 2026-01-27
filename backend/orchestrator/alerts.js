/* eslint-env node */
import { orchestratorAlertRoutes, orchestratorEscalationPolicies, orchestratorAlertDeliveries, nextId } from '../models.js';
import { incrementOrchestratorCounter } from '../metrics.js';

const nowIso = () => new Date().toISOString();

export function listAlertRoutes() {
  return orchestratorAlertRoutes;
}

export function upsertAlertRoute(payload) {
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

export function testAlertRoute(routeId, payload = {}) {
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

export function listEscalationPolicies() {
  return orchestratorEscalationPolicies;
}

export function upsertEscalationPolicy(payload) {
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

export function checkEscalations({ alert = {} } = {}) {
  const activePolicies = orchestratorEscalationPolicies.filter((policy) => policy.enabled);
  const deliveries = [];

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
