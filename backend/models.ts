/*
 * Teachmo Backend Models (TypeScript)
 *
 * This file re-exports the existing JavaScript models from
 * `models.js` while providing a typed surface for callers. It serves as
 * an intermediate step toward a full TypeScript migration of the
 * backend. All new modules should import models from this file
 * instead of directly importing `models.js`. Once the migration is
 * complete, the original `models.js` can be removed entirely.
 */

// Import the existing JavaScript models as a module namespace. This
// keeps compatibility with the ESM backend while offering a typed
// surface for TypeScript callers.
import * as jsModels from './models.js';

/**
 * A map of model names to their types. As the migration to TypeScript
 * progresses, each entry in this interface should be replaced with a
 * concrete type instead of `any`. For example:
 *
 * ```ts
 * interface TeachmoModels {
 *   Program: ProgramModel;
 *   User: UserModel;
 *   // ...
 * }
 * ```
 */
export interface TeachmoModels {
  // TODO(#123): define model types
  [key: string]: any;
}

// Export a typed alias to the underlying JS models. Consumers of this
// module should not assume anything about the internal structure
// beyond what is specified in TeachmoModels. If a model does not
// exist in `jsModels`, accessing it will return undefined.
export const models: TeachmoModels = jsModels as unknown as TeachmoModels;

export default models;
