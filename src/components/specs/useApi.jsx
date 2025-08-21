import { renderHook, waitFor } from '@testing-library/react';
import { useApi, useEntityCrud } from '../../hooks/useApi';
import { server } from '../mocks/server';
import { rest } from 'msw';

// Mock entity for testing
const MockEntity = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  constructor: { name: 'MockEntity' }
};

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('manages loading states correctly', async () => {
    const { result } = renderHook(() => useApi());

    // Initially not loading
    expect(result.current.isLoading('test')).toBe(false);

    // Execute operation
    const promise = result.current.execute(
      () => new Promise(resolve => setTimeout(resolve, 100)),
      { key: 'test' }
    );

    // Should be loading
    expect(result.current.isLoading('test')).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading('test')).toBe(false);
    });
  });

  it('handles errors properly', async () => {
    const { result } = renderHook(() => useApi());

    await result.current.execute(
      () => Promise.reject(new Error('Test error')),
      { key: 'error-test' }
    );

    expect(result.current.hasError('error-test')).toBe(true);
    expect(result.current.getError('error-test').message).toBe('Test error');
  });

  it('shows success toasts when configured', async () => {
    const { result } = renderHook(() => 
      useApi({ showToastOnSuccess: true })
    );

    await result.current.execute(
      () => Promise.resolve('Success'),
      { key: 'success-test', successMessage: 'Operation completed' }
    );

    // Toast should have been shown (we'd need to mock the toast system)
  });

  it('retries failed requests when configured', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('Success');

    const { result } = renderHook(() => 
      useApi({ maxRetries: 1 })
    );

    await result.current.execute(mockFn, { key: 'retry-test' });

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('useEntityCrud Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides CRUD operations for entities', async () => {
    MockEntity.list.mockResolvedValue(['item1', 'item2']);
    MockEntity.create.mockResolvedValue({ id: 'new-item' });

    const { result } = renderHook(() => useEntityCrud(MockEntity));

    await result.current.list();
    expect(MockEntity.list).toHaveBeenCalled();

    await result.current.create({ name: 'Test' });
    expect(MockEntity.create).toHaveBeenCalledWith({ name: 'Test' });
  });

  it('manages entity-specific loading states', async () => {
    MockEntity.list.mockReturnValue(
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    const { result } = renderHook(() => useEntityCrud(MockEntity));

    const promise = result.current.list();
    expect(result.current.isLoading('list')).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading('list')).toBe(false);
    });
  });

  it('handles entity operation errors', async () => {
    MockEntity.update.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useEntityCrud(MockEntity));

    await result.current.update('123', { name: 'Updated' });

    expect(result.current.hasError('update', '123')).toBe(true);
  });
});