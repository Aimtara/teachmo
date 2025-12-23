import { nhostAdapter } from './nhostAdapter';
import type { BackendAdapter } from './types';

export const backendAdapter: BackendAdapter = nhostAdapter;

export * from './types';
export { nhostAdapter };
export default backendAdapter;
