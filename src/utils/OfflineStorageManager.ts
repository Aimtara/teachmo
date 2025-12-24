import { del, get, set } from 'idb-keyval';

export const queueAction = async (key: string, data: unknown) => set(key, data);
export const dequeueAction = async (key: string) => del(key);
export const getQueuedAction = async <T = unknown>(key: string) => get<T>(key);
