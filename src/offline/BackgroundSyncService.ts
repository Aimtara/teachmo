import { listQueuedRequests, removeRequest } from './OfflineStorageManager';

export async function flushQueuedRequests() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const queue = await listQueuedRequests();
  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      if (res.ok) {
        await removeRequest(item.id);
      }
    } catch (err) {
      break;
    }
  }
}

export async function getQueuedRequests() {
  return listQueuedRequests();
}
