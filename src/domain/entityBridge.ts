import { apiClient } from '@/services/core/client';

export type AnyRecord = Record<string, unknown>;

export type EntityBridge = {
  list?: (...args: unknown[]) => Promise<unknown>;
  filter?: (...args: unknown[]) => Promise<unknown>;
  get?: (...args: unknown[]) => Promise<unknown>;
  create?: (...args: unknown[]) => Promise<unknown>;
  update?: (...args: unknown[]) => Promise<unknown>;
  delete?: (...args: unknown[]) => Promise<unknown>;
};

export function createEntityBridge(name: string): EntityBridge {
  return {
    list: (...args: unknown[]) => apiClient.entity.list(name, ...args),
    filter: (...args: unknown[]) => apiClient.entity.filter(name, ...args),
    get: (...args: unknown[]) => apiClient.entity.get(name, ...args),
    create: (...args: unknown[]) => apiClient.entity.create(name, ...args),
    update: (...args: unknown[]) => apiClient.entity.update(name, ...args),
    delete: (...args: unknown[]) => apiClient.entity.delete(name, ...args)
  };
}

export function createInvokeBridge(name: string) {
  return (payload?: AnyRecord) => apiClient.functions.invoke(name, payload);
}
