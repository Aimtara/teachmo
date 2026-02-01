import { base44 } from '@/api/base44/client';

type EntityClient = {
  list?: (params?: Record<string, unknown>) => Promise<unknown>;
  filter?: (params?: Record<string, unknown>) => Promise<unknown>;
  get?: (id: string) => Promise<unknown>;
  create?: (payload: Record<string, unknown>) => Promise<unknown>;
  update?: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  delete?: (id: string) => Promise<unknown>;
};

const getEntityClient = (name: string): EntityClient => {
  const entityClient = base44?.entities?.[name] as EntityClient | undefined;
  if (!entityClient) {
    throw new Error(`Entity client "${name}" is not configured.`);
  }
  return entityClient;
};

export const apiClient = {
  auth: {
    async me<T>(): Promise<T | null> {
      if (!base44?.auth?.me) {
        throw new Error('Base44 auth client is not configured.');
      }
      const result = await base44.auth.me();
      return (result ?? null) as T | null;
    },
    async logout(): Promise<void> {
      if (!base44?.auth?.logout) {
        throw new Error('Base44 auth client is not configured.');
      }
      await base44.auth.logout();
    },
    async updateMe<T>(payload: Record<string, unknown>): Promise<T> {
      if (!base44?.auth?.updateMe) {
        throw new Error('Base44 auth client is not configured.');
      }
      const result = await base44.auth.updateMe(payload);
      return result as T;
    },
  },
  entity: {
    async list<T>(name: string, params?: Record<string, unknown>): Promise<T[]> {
      const client = getEntityClient(name);
      if (!client.list) {
        throw new Error(`Entity "${name}" does not support list.`);
      }
      const result = await client.list(params);
      return Array.isArray(result) ? (result as T[]) : [];
    },
    async filter<T>(name: string, params?: Record<string, unknown>): Promise<T[]> {
      const client = getEntityClient(name);
      if (!client.filter) {
        throw new Error(`Entity "${name}" does not support filter.`);
      }
      const result = await client.filter(params);
      return Array.isArray(result) ? (result as T[]) : [];
    },
    async get<T>(name: string, id: string): Promise<T | null> {
      const client = getEntityClient(name);
      if (!client.get) {
        throw new Error(`Entity "${name}" does not support get.`);
      }
      const result = await client.get(id);
      return (result ?? null) as T | null;
    },
    async create<T>(name: string, payload: Record<string, unknown>): Promise<T> {
      const client = getEntityClient(name);
      if (!client.create) {
        throw new Error(`Entity "${name}" does not support create.`);
      }
      const result = await client.create(payload);
      return result as T;
    },
    async update<T>(name: string, id: string, payload: Record<string, unknown>): Promise<T> {
      const client = getEntityClient(name);
      if (!client.update) {
        throw new Error(`Entity "${name}" does not support update.`);
      }
      const result = await client.update(id, payload);
      return result as T;
    },
    async delete(name: string, id: string): Promise<void> {
      const client = getEntityClient(name);
      if (!client.delete) {
        throw new Error(`Entity "${name}" does not support delete.`);
      }
      await client.delete(id);
    },
  },
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    // TODO: Replace with actual fetch or Base44 function wrapper.
    // This allows swapping the backend implementation later without touching UI code.
    console.log(`[GET] ${endpoint}`, params);
    return {} as T;
  },
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    console.log(`[POST] ${endpoint}`, body);
    return {} as T;
  },
  functions: {
    async invoke<T>(name: string, payload?: Record<string, unknown>): Promise<T> {
      if (!base44?.functions?.invoke) {
        throw new Error('Base44 functions client is not configured.');
      }
      const result = await base44.functions.invoke(name, payload || {});
      return result as T;
    },
  },
};
