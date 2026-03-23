/**
 * Shared project field configuration constants.
 * Used by both validate-project-config.mjs and project-sync-issue-pack.mjs
 * to ensure validation and sync logic stay in sync.
 */

export const REQUIRED_STATUS_OPTIONS = ['Todo', 'In Progress', 'Blocked', 'Done'];
export const REQUIRED_PRIORITY_OPTIONS = ['P0', 'P1', 'P2'];
