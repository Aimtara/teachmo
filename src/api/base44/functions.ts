// Base44/Nhost function invokers.
//
// NOTE:
// This file previously re-exported `../functions`, which created a circular import:
//   src/api/functions -> src/api/base44/functions -> src/api/functions
// That caused stubs to silently win over real function calls.
//
// The "legacy" invokers are the real fetch-based Nhost function callers.

import * as legacyFunctions from './legacy/functions';

export const base44FunctionsMap = {
  ...legacyFunctions
};

export default base44FunctionsMap;
export * from './legacy/functions';
