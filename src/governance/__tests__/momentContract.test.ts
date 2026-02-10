import { getCurrentMoment, MomentContract } from '../momentContract';

describe('getCurrentMoment', () => {
  it('returns "morning" for hours 6-8', () => {
    expect(getCurrentMoment(new Date('2024-01-01T06:00:00'))).toBe('morning');
    expect(getCurrentMoment(new Date('2024-01-01T07:30:00'))).toBe('morning');
    expect(getCurrentMoment(new Date('2024-01-01T08:59:59'))).toBe('morning');
  });

  it('returns "mid_morning" for hours 9-11', () => {
    expect(getCurrentMoment(new Date('2024-01-01T09:00:00'))).toBe('mid_morning');
    expect(getCurrentMoment(new Date('2024-01-01T10:30:00'))).toBe('mid_morning');
    expect(getCurrentMoment(new Date('2024-01-01T11:59:59'))).toBe('mid_morning');
  });

  it('returns "midday" for hours 12-14', () => {
    expect(getCurrentMoment(new Date('2024-01-01T12:00:00'))).toBe('midday');
    expect(getCurrentMoment(new Date('2024-01-01T13:30:00'))).toBe('midday');
    expect(getCurrentMoment(new Date('2024-01-01T14:59:59'))).toBe('midday');
  });

  it('returns "afternoon" for hours 15-17', () => {
    expect(getCurrentMoment(new Date('2024-01-01T15:00:00'))).toBe('afternoon');
    expect(getCurrentMoment(new Date('2024-01-01T16:30:00'))).toBe('afternoon');
    expect(getCurrentMoment(new Date('2024-01-01T17:59:59'))).toBe('afternoon');
  });

  it('returns "evening" for hours 18-21', () => {
    expect(getCurrentMoment(new Date('2024-01-01T18:00:00'))).toBe('evening');
    expect(getCurrentMoment(new Date('2024-01-01T19:30:00'))).toBe('evening');
    expect(getCurrentMoment(new Date('2024-01-01T21:59:59'))).toBe('evening');
  });

  it('returns "latenight" for hours 22-23', () => {
    expect(getCurrentMoment(new Date('2024-01-01T22:00:00'))).toBe('latenight');
    expect(getCurrentMoment(new Date('2024-01-01T23:30:00'))).toBe('latenight');
    expect(getCurrentMoment(new Date('2024-01-01T23:59:59'))).toBe('latenight');
  });

  it('returns "latenight" for hours 0-5 (midnight to early morning)', () => {
    expect(getCurrentMoment(new Date('2024-01-01T00:00:00'))).toBe('latenight');
    expect(getCurrentMoment(new Date('2024-01-01T02:30:00'))).toBe('latenight');
    expect(getCurrentMoment(new Date('2024-01-01T05:59:59'))).toBe('latenight');
  });

  it('handles edge cases at hour boundaries correctly', () => {
    // Test exact hour boundaries
    expect(getCurrentMoment(new Date('2024-01-01T05:59:59'))).toBe('latenight');
    expect(getCurrentMoment(new Date('2024-01-01T06:00:00'))).toBe('morning');
    expect(getCurrentMoment(new Date('2024-01-01T08:59:59'))).toBe('morning');
    expect(getCurrentMoment(new Date('2024-01-01T09:00:00'))).toBe('mid_morning');
    expect(getCurrentMoment(new Date('2024-01-01T21:59:59'))).toBe('evening');
    expect(getCurrentMoment(new Date('2024-01-01T22:00:00'))).toBe('latenight');
  });
});

describe('MomentContract', () => {
  it('defines rules for all moment types', () => {
    expect(MomentContract.morning).toBeDefined();
    expect(MomentContract.mid_morning).toBeDefined();
    expect(MomentContract.midday).toBeDefined();
    expect(MomentContract.afternoon).toBeDefined();
    expect(MomentContract.evening).toBeDefined();
    expect(MomentContract.latenight).toBeDefined();
  });

  it('has valid structure for each moment', () => {
    Object.values(MomentContract).forEach((rules) => {
      expect(rules).toHaveProperty('cognitiveBudgetSeconds');
      expect(rules).toHaveProperty('allowedSurfaces');
      expect(rules).toHaveProperty('allowNavigation');
      expect(rules).toHaveProperty('maxPrimaryActions');
      expect(Array.isArray(rules.allowedSurfaces)).toBe(true);
      expect(typeof rules.cognitiveBudgetSeconds).toBe('number');
      expect(typeof rules.allowNavigation).toBe('boolean');
      expect(typeof rules.maxPrimaryActions).toBe('number');
    });
  });
});
