import { compatClient } from '@/api/compatClient';
import { functionsMap } from '@/api/legacy/functions';
import { nhost } from '@/lib/nhostClient';
import { createLogger } from '@/utils/logger';

const logger = createLogger('api-client');

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
  const entityClient = (compatClient.entities as Record<string, EntityClient | undefined>)[name];
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
  async get<T>(_endpoint: string, _params?: Record<string, unknown>): Promise<T> {
    throw new Error('apiClient.get is not implemented. Use a domain module or requestJson instead.');
  },
  async post<T>(_endpoint: string, _body: unknown): Promise<T> {
    throw new Error('apiClient.post is not implemented. Use a domain module or requestJson instead.');
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    logger.debug(`[GET] ${endpoint}`, params != null ? { hasParams: true } : undefined);
    return {} as T;
  },
  async post<T>(endpoint: string, _body: unknown): Promise<T> {
    logger.debug(`[POST] ${endpoint}`);
    return {} as T;
  },
  functions: {
    async invoke<T>(name: string, payload?: Record<string, unknown>): Promise<T> {
      const invoker = functionsMap?.[name as keyof typeof functionsMap] as
        | ((input?: Record<string, unknown>) => Promise<T>)
        | undefined;
      if (!invoker) {
        throw new Error(`Function "${name}" is not configured.`);
      }
      return invoker(payload || {});
    }
  }
};
