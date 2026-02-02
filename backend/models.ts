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
 * concrete type instead of `any`.
 *
 * The properties listed here document the models that are currently
 * expected to exist on the underlying `models.js` export. Even though
 * they are temporarily typed as `any`, callers can rely on these names
 * being present. As individual models are migrated, update the
 * corresponding property types.
 *
 * For example, once a `ProgramModel` type exists:
 *
 * ```ts
 * interface TeachmoModels {
 *   Program: ProgramModel;
 *   User: UserModel;
 *   Assignment: AssignmentModel;
 * }
 * ```
 */
export interface TeachmoModels {
  // Known models exported from `models.js`. Replace `any` with concrete
  // types as the backend is migrated to TypeScript.
  Program: any;
  User: any;
  Assignment: any;
}

// Export a typed alias to the underlying JS models. Consumers of this
// module should not assume anything about the internal structure
// beyond what is specified in TeachmoModels. If a model does not
// exist in `jsModels`, accessing it will return undefined.
export const models: TeachmoModels = jsModels as unknown as TeachmoModels;

export default models;
