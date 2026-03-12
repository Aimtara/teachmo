// Compatibility module for Base44 UI components.
// Many legacy components import functions from `@/api/functions`.
//
// This re-exports the shared function layer implemented in `src/api/functions/index.ts`
// so both JS and TS callers resolve the same helper set (moderateContent, etc).

export * from './functions/index';
export { default } from './functions/index';
