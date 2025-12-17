import * as base44Functions from './legacy/functions';

// Centralize Base44 function imports to ease future migrations.
export const base44FunctionsMap = base44Functions;
export default base44Functions;

export * from './legacy/functions';
