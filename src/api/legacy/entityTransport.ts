/**
 * Stub factory for entity clients that have not yet been migrated to Nhost/GraphQL.
 *
 * Entity clients in entities.generated.js and entities.bridge.ts use this factory
 * so they do NOT delegate back through apiClient (which would create an import cycle
 * and infinite recursion). Calling any method on a stub throws EntityNotMigratedError,
 * giving a clear signal for which entities still need a domain-layer implementation.
 */

export class EntityNotMigratedError extends Error {
  readonly entityName: string;
  readonly operation: string;

  constructor(entityName: string, operation: string) {
    super(
      `Entity "${entityName}" operation "${operation}" is not yet migrated to Nhost. ` +
        'Implement a GraphQL-backed version in the domain layer.'
    );
    this.name = 'EntityNotMigratedError';
    this.entityName = entityName;
    this.operation = operation;
  }
}

export type EntityStub = {
  list: (...args: unknown[]) => Promise<unknown[]>;
  filter: (...args: unknown[]) => Promise<unknown[]>;
  get: (...args: unknown[]) => Promise<unknown>;
  create: (...args: unknown[]) => Promise<unknown>;
  update: (...args: unknown[]) => Promise<unknown>;
  delete: (...args: unknown[]) => Promise<void>;
};

export function createEntityStub(name: string): EntityStub {
  const notImplemented =
    (op: string) =>
    (..._args: unknown[]): Promise<never> =>
      Promise.reject(new EntityNotMigratedError(name, op));

  return {
    list: notImplemented('list'),
    filter: notImplemented('filter'),
    get: notImplemented('get'),
    create: notImplemented('create'),
    update: notImplemented('update'),
    delete: notImplemented('delete'),
  };
}

