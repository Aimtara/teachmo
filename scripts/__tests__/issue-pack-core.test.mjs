import { describe, it, expect } from 'vitest';
import {
  markerFor,
  boolEnv,
  buildParentBodyWithLinks,
  normalizeAssignees,
  findIssueByKey,
} from '../issue-pack-core.mjs';

describe('markerFor', () => {
  it('returns the expected HTML comment marker', () => {
    expect(markerFor('gate-0')).toBe('<!-- issue-pack-key: gate-0 -->');
  });

  it('handles keys with hyphens and alphanumerics', () => {
    expect(markerFor('ai-runtime-audit')).toBe('<!-- issue-pack-key: ai-runtime-audit -->');
  });
});

describe('boolEnv', () => {
  it('returns fallback when env var is not set', () => {
    delete process.env._TEST_BOOL_UNSET;
    expect(boolEnv('_TEST_BOOL_UNSET', true)).toBe(true);
    expect(boolEnv('_TEST_BOOL_UNSET', false)).toBe(false);
  });

  it('returns fallback when env var is empty string', () => {
    process.env._TEST_BOOL_EMPTY = '';
    expect(boolEnv('_TEST_BOOL_EMPTY', true)).toBe(true);
    delete process.env._TEST_BOOL_EMPTY;
  });

  it('returns true for "true" (case-insensitive)', () => {
    process.env._TEST_BOOL_TRUE = 'true';
    expect(boolEnv('_TEST_BOOL_TRUE', false)).toBe(true);
    delete process.env._TEST_BOOL_TRUE;

    process.env._TEST_BOOL_TRUE_UC = 'TRUE';
    expect(boolEnv('_TEST_BOOL_TRUE_UC', false)).toBe(true);
    delete process.env._TEST_BOOL_TRUE_UC;
  });

  it('returns false for "false"', () => {
    process.env._TEST_BOOL_FALSE = 'false';
    expect(boolEnv('_TEST_BOOL_FALSE', true)).toBe(false);
    delete process.env._TEST_BOOL_FALSE;
  });

  it('returns false for any non-"true" value', () => {
    process.env._TEST_BOOL_OTHER = '1';
    expect(boolEnv('_TEST_BOOL_OTHER', true)).toBe(false);
    delete process.env._TEST_BOOL_OTHER;
  });
});

describe('normalizeAssignees', () => {
  it('returns empty array for no assignees', () => {
    expect(normalizeAssignees()).toEqual([]);
    expect(normalizeAssignees([], {})).toEqual([]);
  });

  it('passes through usernames that are not in the map', () => {
    expect(normalizeAssignees(['alice', 'bob'], {})).toEqual(['alice', 'bob']);
  });

  it('maps display names to GitHub usernames', () => {
    const map = { 'Alice Smith': 'alice', 'Bob Jones': 'bjones' };
    expect(normalizeAssignees(['Alice Smith', 'Bob Jones'], map)).toEqual(['alice', 'bjones']);
  });

  it('falls back to original name when map value is empty string', () => {
    const map = { 'Alice Smith': '' };
    // empty string in map causes fallback to original name
    expect(normalizeAssignees(['Alice Smith'], map)).toEqual(['Alice Smith']);
  });

  it('supports a mix of mapped and unmapped entries', () => {
    const map = { 'Alice Smith': 'alice' };
    expect(normalizeAssignees(['Alice Smith', 'bob'], map)).toEqual(['alice', 'bob']);
  });
});

describe('findIssueByKey', () => {
  const issues = [
    { number: 1, body: '<!-- issue-pack-key: gate-0 -->\nsome content' },
    { number: 2, body: '<!-- issue-pack-key: gate-1 -->\nother content' },
    { number: 3, body: 'no marker here' },
    { number: 4, body: null },
  ];

  it('finds an issue matching the key', () => {
    expect(findIssueByKey(issues, 'gate-0')).toBe(issues[0]);
    expect(findIssueByKey(issues, 'gate-1')).toBe(issues[1]);
  });

  it('returns undefined when no issue has the key', () => {
    expect(findIssueByKey(issues, 'nonexistent')).toBeUndefined();
  });

  it('handles issues with null body', () => {
    expect(findIssueByKey(issues, 'gate-0')).toBe(issues[0]);
  });
});

describe('buildParentBodyWithLinks', () => {
  const LINKS_START = '<!-- issue-pack-links:start -->';
  const LINKS_END = '<!-- issue-pack-links:end -->';

  const children = [
    { number: 10, title: 'Gate 0' },
    { number: 11, title: 'Gate 1' },
  ];

  it('appends a links block when no existing block is present', () => {
    const body = 'Intro text\n\n## Goal\nDo stuff.';
    const result = buildParentBodyWithLinks(body, children);
    expect(result).toContain(LINKS_START);
    expect(result).toContain(LINKS_END);
    expect(result).toContain('- [ ] #10 — Gate 0');
    expect(result).toContain('- [ ] #11 — Gate 1');
    expect(result.startsWith(body)).toBe(true);
  });

  it('replaces an existing links block in-place', () => {
    const existingBlock = `${LINKS_START}\n## Linked child issues\n\n- [ ] #5 — Old Issue\n${LINKS_END}`;
    const body = `Intro\n\n${existingBlock}\n\n## Manual section\nKeep me.`;
    const result = buildParentBodyWithLinks(body, children);
    expect(result).toContain('- [ ] #10 — Gate 0');
    expect(result).not.toContain('#5 — Old Issue');
    // manual section after the block should be preserved
    expect(result).toContain('## Manual section\nKeep me.');
  });

  it('produces correct structure with start/end markers wrapping the list', () => {
    const result = buildParentBodyWithLinks('header', children);
    const startIdx = result.indexOf(LINKS_START);
    const endIdx = result.indexOf(LINKS_END);
    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(startIdx);
    const block = result.slice(startIdx, endIdx + LINKS_END.length);
    expect(block).toContain('## Linked child issues');
    expect(block).toContain('- [ ] #10 — Gate 0');
    expect(block).toContain('- [ ] #11 — Gate 1');
  });
});
