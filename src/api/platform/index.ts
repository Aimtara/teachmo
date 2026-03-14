import { platformEntitiesMap } from './entities';
import { platformFunctionsMap } from './functions';

export { platformEntitiesMap, default as platformEntities } from './entities';
export { platformFunctionsMap, default as platformFunctions } from './functions';

export const platformApi = {
  entities: platformEntitiesMap,
  functions: platformFunctionsMap
};
