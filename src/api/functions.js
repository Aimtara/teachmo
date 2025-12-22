// Compatibility module for Base44 UI components.
// Many legacy components import functions from `@/api/functions`.
//
// For now, this re-exports the existing Nhost function invokers (submitReport, etc.).
// A later cleanup patch will remove the `src/API` directory and consolidate under `src/api/*`.

export * from './base44/functions';
export { default } from './base44/functions';
