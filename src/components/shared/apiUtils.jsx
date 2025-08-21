
// API utilities with enhanced error handling and rate limiting
import { User } from '@/api/entities';

// Rate limiting utilities
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.resetInterval = 60000; // 1 minute
  }

  canMakeRequest(key, maxRequests = 10) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.resetInterval) * this.resetInterval;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 0, windowStart });
    }
    
    const requestData = this.requests.get(key);
    
    // Reset if new window
    if (requestData.windowStart < windowStart) {
      requestData.count = 0;
      requestData.windowStart = windowStart;
    }
    
    if (requestData.count >= maxRequests) {
      return false;
    }
    
    requestData.count++;
    return true;
  }

  getRetryAfter(key) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.resetInterval) * this.resetInterval;
    const nextWindow = windowStart + this.resetInterval;
    return Math.ceil((nextWindow - now) / 1000); // seconds
  }
}

const rateLimiter = new RateLimiter();

// Enhanced fetch with retry logic and rate limiting
export const fetchWithRetry = async (fetchFn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryOn = [429, 500, 502, 503, 504],
    rateLimitKey = 'default'
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before making request
      if (!rateLimiter.canMakeRequest(rateLimitKey)) {
        const retryAfter = rateLimiter.getRetryAfter(rateLimitKey);
        throw new Error(`Rate limited. Try again in ${retryAfter} seconds.`);
      }

      const result = await fetchFn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Handle rate limiting specifically
      if (error.message?.includes('429') || error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || 60;
        console.warn(`Rate limited. Waiting ${retryAfter} seconds before retry.`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }
      
      // Check if error is retryable
      const isRetryable = retryOn.includes(error.response?.status);
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
        console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw lastError; // Non-retryable error or max retries reached
      }
    }
  }
  throw lastError; // Should not be reached, but as a fallback
};

// Cached user fetch
let userCache = null;
let userCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchUserWithCache = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && userCache && (now - userCacheTimestamp) < CACHE_DURATION) {
    return userCache;
  }

  try {
    const user = await fetchWithRetry(() => User.me(), { rateLimitKey: 'user.me' });
    userCache = user;
    userCacheTimestamp = now;
    return user;
  } catch (error) {
    // If fetching fails, clear cache to force a re-fetch next time
    userCache = null;
    userCacheTimestamp = 0;
    throw error;
  }
};

// Retry utility for auth calls that don't need complex data fetching logic
export const retryAuthCall = async (authFn, maxRetries = 2) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await authFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(res => setTimeout(res, 500 * (i + 1)));
      }
    }
  }
  throw lastError;
};

// Network status utility
export const checkNetworkStatus = () => {
  return {
    online: navigator.onLine,
    // You can add more details like connection type if needed
    // type: navigator.connection?.effectiveType,
  };
};

// Graceful degradation wrapper
export const withGracefulDegradation = (fn, fallbackValue = null) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.warn(`Graceful degradation: Function ${fn.name} failed. Returning fallback.`, error);
      return fallbackValue;
    }
  };
};

export default {
  fetchWithRetry,
  retryAuthCall,
  checkNetworkStatus,
  withGracefulDegradation,
  fetchUserWithCache
};
