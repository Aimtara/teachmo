/**
 * API Retry Utilities
 * 
 * This module provides robust retry logic for API calls with proper error handling.
 * 
 * Key features:
 * - HttpError class: Standardized error type that carries HTTP status information
 * - retryRequest: Exponential backoff with configurable retry policy
 * - Smart retry logic: Avoids retrying client errors (4xx) except rate limits (429)
 * 
 * Example usage:
 * ```typescript
 * // Basic usage with default retry policy
 * const result = await retryRequest(() => fetchData());
 * 
 * // Custom retry policy
 * const result = await retryRequest(
 *   () => fetchData(),
 *   {
 *     retries: 5,
 *     minTimeout: 2000,
 *     shouldRetry: (error) => {
 *       // Custom logic: only retry on specific errors
 *       if (error instanceof HttpError && error.status === 503) {
 *         return true;
 *       }
 *       return false;
 *     }
 *   }
 * );
 * ```
 */

/**
 * Custom error class that carries HTTP status information.
 * Use this for API errors to enable proper retry logic.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

/**
 * Executes an async operation with exponential backoff retry logic.
 * Essential for third-party integrations like Google Classroom and OpenAI.
 */
interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  /**
   * Optional callback to determine if an error should be retried.
   * If not provided, defaults to retrying all errors except 4xx (excluding 429).
   * @param error - The error that was thrown
   * @returns true to retry, false to throw immediately
   */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Default retry policy: retry all errors except 4xx (excluding 429 rate limits).
 */
function defaultShouldRetry(error: unknown): boolean {
  // Check for HttpError with status
  if (error instanceof HttpError) {
    const { status } = error;
    // Don't retry 4xx client errors except 429 (rate limit)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
  }
  
  // Check for axios-style error.response.status
  const status = (error as any)?.response?.status;
  if (status && status >= 400 && status < 500 && status !== 429) {
    return false;
  }
  
  // Retry all other errors (network issues, 5xx, 429, etc.)
  return true;
}

export async function retryRequest<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    retries = 3, 
    minTimeout = 1000, 
    factor = 2,
    shouldRetry = defaultShouldRetry
  } = options;
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt += 1;
      
      // If we've exhausted retries, throw
      if (attempt >= retries) {
        throw error;
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      const delay = minTimeout * Math.pow(factor, attempt - 1);
      console.warn(
        `[API Retry] Attempt ${attempt} failed. Retrying in ${delay}ms...`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
