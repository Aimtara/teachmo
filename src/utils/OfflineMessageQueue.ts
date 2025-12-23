type QueuedMessage = {
  id: string;
  payload: unknown;
};

const STORAGE_KEY = 'offlineMessageQueue';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeRead = (): string | null => {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const loadOfflineQueue = (): QueuedMessage[] => {
  const raw = safeRead();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (queue: QueuedMessage[]) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore write errors (e.g., private browsing)
  }
};

export const saveOfflineQueue = (queue: QueuedMessage[]) => {
  safeWrite(queue);
};

export const enqueueMessage = (message: QueuedMessage) => {
  const queue = loadOfflineQueue();
  queue.push(message);
  saveOfflineQueue(queue);
};

export const flushQueue = (ws: WebSocket) => {
  const queue = loadOfflineQueue();
  if (ws.readyState === WebSocket.OPEN) {
    queue.forEach((msg) => ws.send(JSON.stringify(msg.payload)));
    saveOfflineQueue([]);
  }
};
