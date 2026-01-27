// Minimal load test runner using native fetch (Node 18+).
// Usage:
//   node scripts/loadtest/systemHealth.mjs <url> [requests] [concurrency]
// Example:
//   node scripts/loadtest/systemHealth.mjs http://localhost:1337/v1/functions/systemHealthMonitor 500 25

import { performance } from 'node:perf_hooks';

const url = process.argv[2];
const total = Number(process.argv[3] ?? 200);
const concurrency = Number(process.argv[4] ?? 20);

if (!url) {
  console.error('Missing url. Usage: node scripts/loadtest/systemHealth.mjs <url> [requests] [concurrency]');
  process.exit(1);
}

const started = performance.now();
let completed = 0;
let failed = 0;
const latencies = [];

async function one() {
  const t0 = performance.now();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json().catch(() => null);
  } catch {
    failed += 1;
  } finally {
    completed += 1;
    latencies.push(performance.now() - t0);
  }
}

async function run() {
  let i = 0;
  const inFlight = new Set();

  while (i < total || inFlight.size > 0) {
    while (i < total && inFlight.size < concurrency) {
      const p = one();
      inFlight.add(p);
      p.finally(() => inFlight.delete(p));
      i += 1;
    }
    await Promise.race(inFlight);
  }

  const elapsedMs = performance.now() - started;
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;

  console.log(
    JSON.stringify(
      {
        url,
        total,
        concurrency,
        completed,
        failed,
        rps: (completed / (elapsedMs / 1000)).toFixed(2),
        latencyMs: { p50: p50.toFixed(1), p95: p95.toFixed(1), p99: p99.toFixed(1) },
        elapsedMs: elapsedMs.toFixed(1),
      },
      null,
      2
    )
  );
}

run();
