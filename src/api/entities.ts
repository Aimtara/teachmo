// Domain-aware exports so components can depend on the domain layer
// while keeping backward compatibility with direct entity imports.
import { base44Api, base44EntitiesMap, base44FunctionsMap } from './base44';

export * from './base44/entities';
export { base44Api, base44EntitiesMap, base44FunctionsMap };
export { learnersApi, useChildrenList } from '../domain/learners';
export { orgsApi } from '../domain/orgs';
export { assignmentsApi } from '../domain/assignments';
export { messagingApi } from '../domain/messaging';
