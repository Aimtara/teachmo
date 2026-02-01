import { retryRequest, HttpError } from '../apiRetry';

describe('apiRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HttpError', () => {
    it('should create an HttpError with status', () => {
      const error = new HttpError('Test error', 404);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.name).toBe('HttpError');
    });

    it('should include original error if provided', () => {
      const originalError = new Error('Original');
      const error = new HttpError('Test error', 500, originalError);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('retryRequest', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryRequest(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await retryRequest(fn, { minTimeout: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry 4xx HttpError (except 429)', async () => {
      const fn = jest.fn().mockRejectedValue(new HttpError('Not found', 404));
      
      await expect(retryRequest(fn, { minTimeout: 10 })).rejects.toThrow('Not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry 429 rate limit errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new HttpError('Rate limited', 429))
        .mockResolvedValue('success');
      
      const result = await retryRequest(fn, { minTimeout: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry 5xx server errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new HttpError('Server error', 500))
        .mockResolvedValue('success');
      
      const result = await retryRequest(fn, { minTimeout: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect custom shouldRetry callback', async () => {
      const fn = jest.fn().mockRejectedValue(new HttpError('Bad request', 400));
      const shouldRetry = jest.fn().mockReturnValue(true);
      
      await expect(
        retryRequest(fn, { retries: 2, minTimeout: 10, shouldRetry })
      ).rejects.toThrow('Bad request');
      
      expect(fn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(2);
    });

    it('should handle axios-style error.response.status', async () => {
      const axiosError = {
        response: { status: 403 },
        message: 'Forbidden'
      };
      const fn = jest.fn().mockRejectedValue(axiosError);
      
      await expect(retryRequest(fn, { minTimeout: 10 })).rejects.toEqual(axiosError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry plain errors without status', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Some error'))
        .mockResolvedValue('success');
      
      const result = await retryRequest(fn, { minTimeout: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after exhausting retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(
        retryRequest(fn, { retries: 3, minTimeout: 10 })
      ).rejects.toThrow('Persistent error');
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      jest.useFakeTimers();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success');
      
      const promise = retryRequest(fn, { minTimeout: 100, factor: 2 });
      
      // First call happens immediately
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Second call after 100ms (100 * 2^0)
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(2);
      
      // Third call after 200ms (100 * 2^1)
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(3);
      
      const result = await promise;
      expect(result).toBe('success');
      
      jest.useRealTimers();
    });
  });
});
