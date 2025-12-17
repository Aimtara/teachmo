import { base44EntitiesMap } from './entities';
import { base44FunctionsMap } from './functions';

export { base44EntitiesMap, default as base44Entities } from './entities';
export { base44FunctionsMap, default as base44Functions } from './functions';

export const base44Api = {
  entities: base44EntitiesMap,
  functions: base44FunctionsMap
};
