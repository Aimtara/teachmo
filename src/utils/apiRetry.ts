/**
 * Executes an async operation with exponential backoff retry logic.
 * Essential for third-party integrations like Google Classroom and OpenAI.
 */
interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
}

export async function retryRequest<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 3, minTimeout = 1000, factor = 2 } = options;
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt += 1;
      if (attempt >= retries) {
        throw error;
      }

      const status = error?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
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
