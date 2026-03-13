import { User } from '@/api/entities';
import { createLogger } from '@/utils/logger';

const apiUtilsLogger = createLogger('apiUtils');

type RetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryOn?: number[];
  rateLimitKey?: string;
};

type ErrorLike = {
  message?: string;
  response?: {
    status?: number;
    headers?: Record<string, string | number>;
  };
};

type CachedUser = Record<string, unknown> | null;

type RequestCounter = {
  count: number;
  windowStart: number;
};

class RateLimiter {
  private requests = new Map<string, RequestCounter>();

  private resetInterval = 60_000;

  canMakeRequest(key: string, maxRequests = 10) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.resetInterval) * this.resetInterval;

    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 0, windowStart });
    }

    const requestData = this.requests.get(key);
    if (!requestData) {
      return false;
    }

    if (requestData.windowStart < windowStart) {
      requestData.count = 0;
      requestData.windowStart = windowStart;
    }

    if (requestData.count >= maxRequests) {
      return false;
    }

    requestData.count += 1;
    return true;
  }

  getRetryAfter() {
    const now = Date.now();
    const windowStart = Math.floor(now / this.resetInterval) * this.resetInterval;
    const nextWindow = windowStart + this.resetInterval;
    return Math.ceil((nextWindow - now) / 1000);
  }
}

const rateLimiter = new RateLimiter();

export const fetchWithRetry = async <T>(fetchFn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryOn = [429, 500, 502, 503, 504],
    rateLimitKey = 'default',
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      if (!rateLimiter.canMakeRequest(rateLimitKey)) {
        const retryAfter = rateLimiter.getRetryAfter();
        apiUtilsLogger.warn(`Client rate limit reached. Waiting ${retryAfter} seconds before retry.`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => window.setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        throw new Error(`Rate limited. Try again in ${retryAfter} seconds.`);
      }

      return await fetchFn();
    } catch (error) {
      lastError = error;
      const errorLike = error as ErrorLike;

      if (errorLike.message?.includes('429') || errorLike.response?.status === 429) {
        const retryAfterHeader = errorLike.response?.headers?.['retry-after'];
        const retryAfter = Number(retryAfterHeader ?? 60);
        apiUtilsLogger.warn(`Rate limited. Waiting ${retryAfter} seconds before retry.`);

        if (attempt < maxRetries) {
          await new Promise((resolve) => window.setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }

      const status = errorLike.response?.status;
      const isRetryable = typeof status === 'number' && retryOn.includes(status);

      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(baseDelay * backoffFactor ** attempt, maxDelay);
        apiUtilsLogger.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
};

let userCache: CachedUser = null;
let userCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchUserWithCache = async (forceRefresh = false): Promise<CachedUser> => {
  const now = Date.now();

  if (!forceRefresh && userCache && now - userCacheTimestamp < CACHE_DURATION) {
    return userCache;
  }

  try {
    const user = await fetchWithRetry(() => User.me(), { rateLimitKey: 'user.me' });
    userCache = user as CachedUser;
    userCacheTimestamp = now;
    return userCache;
  } catch (error) {
    userCache = null;
    userCacheTimestamp = 0;
    throw error;
  }
};

export const retryAuthCall = async <T>(authFn: () => Promise<T>, maxRetries = 2): Promise<T> => {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i += 1) {
    try {
      return await authFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }

  throw lastError;
};

export const checkNetworkStatus = () => ({
  online: navigator.onLine,
});

export const withGracefulDegradation = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  fallbackValue: TResult | null = null,
) => {
  return async (...args: TArgs): Promise<TResult | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const safeError = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error);
      apiUtilsLogger.warn(`Graceful degradation: Function ${fn.name} failed. Returning fallback.`, safeError);
      return fallbackValue;
    }
  };
};

export default {
  fetchWithRetry,
  retryAuthCall,
  checkNetworkStatus,
  withGracefulDegradation,
  fetchUserWithCache,
};
