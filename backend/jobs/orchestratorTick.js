/* eslint-env node */
// Orchestrator scheduler entrypoint.
// Usage:
//   node jobs/orchestratorTick.js daily
//   node jobs/orchestratorTick.js weekly
//
// In production, wire this file to cron / cloud scheduler.

import { orchestratorEngine } from '../orchestrator/engine.js';
import { orchestratorStore } from '../orchestrator/store.js';

function getFamilyIds() {
  const env = process.env.ORCH_FAMILY_IDS;
  if (env && env.trim()) return env.split(',').map((s) => s.trim()).filter(Boolean);
  // Fallback: any families seen since process start.
  return Array.from(orchestratorStore.states.keys());
}

async function runDaily() {
  const ids = getFamilyIds();
  const results = [];
  for (const id of ids) {
    try {
      const plan = orchestratorEngine.runDaily(id);
      results.push({ familyId: id, ok: true, planId: plan.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ familyId: id, ok: false, error: msg });
    }
  }
  return results;
}

async function runWeekly() {
  const ids = getFamilyIds();
  const results = [];
  for (const id of ids) {
    try {
      const brief = await orchestratorEngine.runWeekly(id);
      results.push({ familyId: id, ok: true, briefId: brief.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ familyId: id, ok: false, error: msg });
    }
  }
  return results;
}

async function main() {
  const mode = process.argv[2];
  if (mode !== 'daily' && mode !== 'weekly') {
    console.error('Usage: node jobs/orchestratorTick.js daily|weekly');
    process.exit(1);
  }

  const out = mode === 'daily' ? await runDaily() : await runWeekly();
  console.log(JSON.stringify({ mode, results: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
