import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBackoffMs,
  applyRetryPolicy,
  selectDueMessages,
  rollupDeliverabilityEvents,
} from '../jobs/notificationQueue.js';

test('calculateBackoffMs uses exponential backoff with cap', () => {
  const base = 1000;
  const max = 5000;
  assert.equal(calculateBackoffMs(0, { baseDelayMs: base, maxDelayMs: max }), 1000);
  assert.equal(calculateBackoffMs(1, { baseDelayMs: base, maxDelayMs: max }), 2000);
  assert.equal(calculateBackoffMs(2, { baseDelayMs: base, maxDelayMs: max }), 4000);
  assert.equal(calculateBackoffMs(3, { baseDelayMs: base, maxDelayMs: max }), 5000);
});

test('applyRetryPolicy schedules retries and sends to dead letter after max attempts', () => {
  const now = new Date('2024-01-01T00:00:00.000Z');
  const retry = applyRetryPolicy({ attempts: 0, maxAttempts: 3, now, options: { baseDelayMs: 1000 } });
  assert.equal(retry.status, 'pending');
  assert.equal(retry.attempts, 1);
  assert.equal(retry.next_attempt_at, '2024-01-01T00:00:02.000Z');

  const dead = applyRetryPolicy({ attempts: 2, maxAttempts: 3, now, options: { baseDelayMs: 1000 } });
  assert.equal(dead.status, 'dead');
  assert.equal(dead.attempts, 3);
  assert.equal(dead.next_attempt_at, null);
});

test('selectDueMessages filters scheduled messages by send_at', () => {
  const now = new Date('2024-01-01T12:00:00.000Z');
  const messages = [
    { id: '1', status: 'scheduled', send_at: '2024-01-01T10:00:00.000Z' },
    { id: '2', status: 'scheduled', send_at: '2024-01-01T13:00:00.000Z' },
    { id: '3', status: 'pending', send_at: null },
  ];
  const due = selectDueMessages(messages, now);
  assert.deepEqual(due.map((m) => m.id), ['1', '3']);
});

test('rollupDeliverabilityEvents aggregates metrics', () => {
  const metrics = rollupDeliverabilityEvents([
    { event_type: 'delivered' },
    { event_type: 'opened' },
    { event_type: 'clicked' },
    { event_type: 'bounced' },
    { event_type: 'delivered' },
  ]);
  assert.deepEqual(metrics, {
    delivered: 2,
    bounced: 1,
    opened: 1,
    clicked: 1,
    total: 5,
  });
});
