// Compatibility shim for components that import from `@/api/entities` in JS.
// This simply re-exports the TypeScript implementation so JS and TS callers
// resolve the same entity and API helpers.
export * from './entities.ts';
export { base44Api, base44EntitiesMap, base44FunctionsMap } from './entities.ts';
