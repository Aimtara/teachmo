// Domain-aware exports so components can depend on a neutral API layer.
import { platformApi, platformEntitiesMap, platformFunctionsMap } from './platform';

export const entityMap = platformEntitiesMap;
export const functionMap = platformFunctionsMap;

export const apiMaps = {
  entities: entityMap,
  functions: functionMap
};

export { platformApi };

export * from './platform/entities';
export { learnersApi, useChildrenList } from '../domain/learners';
export { orgsApi } from '../domain/orgs';
export { assignmentsApi } from '../domain/assignments';
export { messagingApi } from '../domain/messaging';
