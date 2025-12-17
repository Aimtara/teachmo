import * as base44Entities from './legacy/entities';

// Surface Base44 entity clients from a single module so the backing
// implementation can be swapped without updating every consumer.
export const base44EntitiesMap = base44Entities;
export default base44Entities;

export * from './legacy/entities';
