/* eslint-env jest */
import {
  calculateBackoffMs,
  applyRetryPolicy,
  selectDueMessages,
  rollupDeliverabilityEvents,
  buildGradesCondition,
} from '../jobs/notificationQueue.js';

describe('notification queue helpers', () => {
  test('calculateBackoffMs uses exponential backoff with cap', () => {
    const base = 1000;
    const max = 5000;
    expect(calculateBackoffMs(0, { baseDelayMs: base, maxDelayMs: max })).toBe(1000);
    expect(calculateBackoffMs(1, { baseDelayMs: base, maxDelayMs: max })).toBe(2000);
    expect(calculateBackoffMs(2, { baseDelayMs: base, maxDelayMs: max })).toBe(4000);
    expect(calculateBackoffMs(3, { baseDelayMs: base, maxDelayMs: max })).toBe(5000);
  });

  test('applyRetryPolicy schedules retries and sends to dead letter after max attempts', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const retry = applyRetryPolicy({ attempts: 0, maxAttempts: 3, now, options: { baseDelayMs: 1000 } });
    expect(retry.status).toBe('pending');
    expect(retry.attempts).toBe(1);
    expect(retry.next_attempt_at).toBe('2024-01-01T00:00:02.000Z');

    const dead = applyRetryPolicy({ attempts: 2, maxAttempts: 3, now, options: { baseDelayMs: 1000 } });
    expect(dead.status).toBe('dead');
    expect(dead.attempts).toBe(3);
    expect(dead.next_attempt_at).toBeNull();
  });

  test('selectDueMessages filters scheduled messages by send_at', () => {
    const now = new Date('2024-01-01T12:00:00.000Z');
    const messages = [
      { id: '1', status: 'scheduled', send_at: '2024-01-01T10:00:00.000Z' },
      { id: '2', status: 'scheduled', send_at: '2024-01-01T13:00:00.000Z' },
      { id: '3', status: 'pending', send_at: null },
    ];
    const due = selectDueMessages(messages, now);
    expect(due.map((m) => m.id)).toEqual(['1', '3']);
  });

  test('rollupDeliverabilityEvents aggregates metrics', () => {
    const metrics = rollupDeliverabilityEvents([
      { event_type: 'delivered' },
      { event_type: 'opened' },
      { event_type: 'clicked' },
      { event_type: 'bounced' },
      { event_type: 'delivered' },
    ]);
    expect(metrics).toEqual({
      delivered: 2,
      bounced: 1,
      opened: 1,
      clicked: 1,
      total: 5,
    });
  });

  describe('buildGradesCondition', () => {
    test('returns empty condition when no grades provided', () => {
      const result = buildGradesCondition(1, []);
      expect(result).toEqual({ sql: '', params: [], nextIdx: 1 });
    });

    test('filters out empty/null grades', () => {
      const result = buildGradesCondition(1, ['', null, '  ', undefined]);
      expect(result).toEqual({ sql: '', params: [], nextIdx: 1 });
    });

    test('normalizes grades to lowercase', () => {
      const result = buildGradesCondition(1, ['3', 'K', '12']);
      expect(result.params[0]).toEqual(['3', 'k', '12']);
      expect(result.nextIdx).toBe(2);
    });

    test('generates SQL with delimiter-aware regex patterns', () => {
      const result = buildGradesCondition(1, ['1', '2']);
      expect(result.sql).toContain('exists (');
      expect(result.sql).toContain('unnest($1::text[])');
      expect(result.sql).toContain("lower(coalesce(p.grades, ''))");
      // Should use boundary patterns to avoid false positives
      expect(result.sql).toContain('(^|\\D)');
      expect(result.sql).toContain('(\\D|$)');
    });

    test('matches various grade formats in SQL pattern', () => {
      // This test documents the expected behavior - actual matching happens in SQL
      const result = buildGradesCondition(1, ['1']);
      expect(result.sql).toContain('grade ');
      expect(result.sql).toContain('(st|nd|rd|th)');
    });
  });
});
