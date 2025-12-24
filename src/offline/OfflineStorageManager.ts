import { createStore, get, set } from 'idb-keyval';

export type OfflineRequest = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  createdAt: string;
};

const store = createStore('teachmo-offline', 'outbox');
const QUEUE_KEY = 'queue';

async function readQueue(): Promise<OfflineRequest[]> {
  return (await get(QUEUE_KEY, store)) || [];
}

async function writeQueue(queue: OfflineRequest[]) {
  await set(QUEUE_KEY, queue, store);
}

export async function enqueueRequest(request: Omit<OfflineRequest, 'id' | 'createdAt'>) {
  const queue = await readQueue();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const entry: OfflineRequest = {
    ...request,
    id,
    createdAt: new Date().toISOString()
  };
  queue.push(entry);
  await writeQueue(queue);
  return entry;
}

export async function removeRequest(id: string) {
  const queue = await readQueue();
  const next = queue.filter((item) => item.id !== id);
  await writeQueue(next);
}

export async function listQueuedRequests(): Promise<OfflineRequest[]> {
  const queue = await readQueue();
  return queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function clearQueue() {
  await writeQueue([]);
}
