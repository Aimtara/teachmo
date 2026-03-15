import { entityMap, functionMap } from '@/api/entities';
import { nhost } from '@/lib/nhostClient';
import { requestJson } from '@/api/http/client';

type EntityClient = {
  list?: (...args: unknown[]) => Promise<unknown>;
  filter?: (...args: unknown[]) => Promise<unknown>;
  get?: (...args: unknown[]) => Promise<unknown>;
  create?: (...args: unknown[]) => Promise<unknown>;
  update?: (...args: unknown[]) => Promise<unknown>;
  delete?: (...args: unknown[]) => Promise<unknown>;
};

type NhostAuthClient = {
  getUser?: () => Promise<unknown> | unknown;
  signOut?: () => Promise<unknown>;
  updateUser?: (payload: Record<string, unknown>) => Promise<unknown>;
};

const getEntityClient = (name: string): EntityClient => {
  const entityClient = entityMap?.[name as keyof typeof entityMap] as EntityClient | undefined;
  if (!entityClient) {
    throw new Error(`Entity client "${name}" is not configured.`);
  }
  return entityClient;
};

const getAuthClient = (): NhostAuthClient => (nhost as unknown as { auth?: NhostAuthClient })?.auth ?? {};

export const apiClient = {
  auth: {
    async me<T>(): Promise<T | null> {
      const auth = getAuthClient();
      if (!auth.getUser) {
        throw new Error('Nhost auth client is not configured.');
      }
      const result = await auth.getUser();
      return (result ?? null) as T | null;
    },
    async logout(): Promise<void> {
      const auth = getAuthClient();
      if (!auth.signOut) {
        throw new Error('Nhost auth client is not configured.');
      }
      await auth.signOut();
    },
    async updateMe<T>(payload: Record<string, unknown>): Promise<T> {
      const auth = getAuthClient();
      if (!auth.updateUser) {
        throw new Error('Nhost auth client is not configured.');
      }
      const result = await auth.updateUser(payload);
      return result as T;
    }
  },
  entity: {
    async list<T>(name: string, ...args: unknown[]): Promise<T[]> {
      const client = getEntityClient(name);
      if (!client.list) {
        throw new Error(`Entity "${name}" does not support list.`);
      }
      const result = await client.list(...args);
      return Array.isArray(result) ? (result as T[]) : [];
    },
    async filter<T>(name: string, ...args: unknown[]): Promise<T[]> {
      const client = getEntityClient(name);
      if (!client.filter) {
        throw new Error(`Entity "${name}" does not support filter.`);
      }
      const result = await client.filter(...args);
      return Array.isArray(result) ? (result as T[]) : [];
    },
    async get<T>(name: string, ...args: unknown[]): Promise<T | null> {
      const client = getEntityClient(name);
      if (!client.get) {
        throw new Error(`Entity "${name}" does not support get.`);
      }
      const result = await client.get(...args);
      return (result ?? null) as T | null;
    },
    async create<T>(name: string, ...args: unknown[]): Promise<T> {
      const client = getEntityClient(name);
      if (!client.create) {
        throw new Error(`Entity "${name}" does not support create.`);
      }
      const result = await client.create(...args);
      return result as T;
    },
    async update<T>(name: string, ...args: unknown[]): Promise<T> {
      const client = getEntityClient(name);
      if (!client.update) {
        throw new Error(`Entity "${name}" does not support update.`);
      }
      const result = await client.update(...args);
      return result as T;
    },
    async delete(name: string, ...args: unknown[]): Promise<void> {
      const client = getEntityClient(name);
      if (!client.delete) {
        throw new Error(`Entity "${name}" does not support delete.`);
      }
      await client.delete(...args);
    }
  },
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    let url = endpoint;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      url = `${endpoint}?${qs}`;
    }
    return requestJson<T>(url, { method: 'GET' });
  },
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return requestJson<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  functions: {
    async invoke<T>(name: string, payload?: Record<string, unknown>): Promise<T> {
      const invoker = functionMap?.[name as keyof typeof functionMap] as
        | ((input?: Record<string, unknown>) => Promise<T>)
        | undefined;
      if (!invoker) {
        throw new Error(`Function "${name}" is not configured.`);
      }
      return invoker(payload || {});
    }
  }
};
