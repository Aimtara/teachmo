import { summarizeWeeklyInputs, generateBriefWithLLM } from '../weeklyBrief';
import { resolveWeekRange } from '../weekRange';

describe('weekly brief utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  test('resolveWeekRange aligns to Monday start and Sunday end', () => {
    const { week_start_date, week_end_date } = resolveWeekRange('2025-01-15');
    expect(week_start_date).toBe('2025-01-13');
    expect(week_end_date).toBe('2025-01-19');
  });

  test('summarizeWeeklyInputs filters communications and scores load', () => {
    const payload = {
      week_start: '2025-01-13',
      week_end: '2025-01-19',
      child: { id: 'child-1', first_name: 'Alex', birthdate: '2016-02-05' },
      school_events: [
        { id: 'ev-1', title: 'Early dismissal', description: 'Half-day', starts_at: '2025-01-14T09:00:00Z' },
        { id: 'ev-2', title: 'Out of range', description: 'No school', starts_at: '2025-01-22T09:00:00Z' }
      ],
      announcements: [
        { id: 'a-1', title: 'Weekly newsletter', body: 'This week at school...' },
        { id: 'a-2', title: 'Field trip', body: 'Permission slip required by Friday' }
      ],
      messages: [
        { id: 'm-1', title: 'Grades update', body: 'Your student scored...' },
        { id: 'm-2', title: 'Urgent', body: 'Please sign up for conference' }
      ]
    };

    const summary = summarizeWeeklyInputs(payload);
    expect(summary.school_signals.disruptions).toHaveLength(1);
    expect(summary.school_signals.disruptions[0].kind).toBe('early_dismissal');
    expect(summary.communications.important).toHaveLength(2);
    expect(summary.communications.ignored_count).toBe(2);
    expect(summary.load_score).toBeGreaterThan(0);
  });

  test('generateBriefWithLLM falls back on invalid JSON response', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not-json' } }] })
    });

    const summary = summarizeWeeklyInputs({ week_start: '2025-01-13', week_end: '2025-01-19' });
    const result = await generateBriefWithLLM({
      weekRange: 'January 13–January 19, 2025',
      uxState: 'B',
      summary
    });

    expect(result.used_fallback).toBe(true);
    expect(result.draft.shape_of_the_week).toBeTruthy();
  });

  test('generateBriefWithLLM falls back on OpenAI error response', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' })
    });

    const summary = summarizeWeeklyInputs({ week_start: '2025-01-13', week_end: '2025-01-19' });
    const result = await generateBriefWithLLM({
      weekRange: 'January 13–January 19, 2025',
      uxState: 'B',
      summary
    });

    expect(result.used_fallback).toBe(true);
    expect(result.fallback_reason).toBeTruthy();
  });
});
