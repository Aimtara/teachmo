import { describe, expect, it, vi } from 'vitest';

const { entitiesMock, functionsMock, authMock } = vi.hoisted(() => ({
  entitiesMock: {
    Sample: {
      list: vi.fn(),
      filter: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  },
  functionsMock: {
    testFn: vi.fn()
  },
  authMock: {
    getUser: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn()
  }
}));

vi.mock('@/api/entities', () => ({
  entityMap: entitiesMock,
  functionMap: functionsMock
}));

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: authMock
  }
}));

import { apiClient } from '../client';

describe('apiClient', () => {
  it('wraps entity list and filter', async () => {
    entitiesMock.Sample.list.mockResolvedValue([{ id: 'one' }]);
    entitiesMock.Sample.filter.mockResolvedValue([{ id: 'two' }]);

    await expect(apiClient.entity.list('Sample')).resolves.toEqual([{ id: 'one' }]);
    await expect(apiClient.entity.filter('Sample')).resolves.toEqual([{ id: 'two' }]);
  });

  it('wraps auth methods via nhost auth', async () => {
    authMock.getUser.mockResolvedValue({ id: 'user-1' });
    authMock.updateUser.mockResolvedValue({ id: 'user-1', name: 'Updated' });

    await expect(apiClient.auth.me()).resolves.toEqual({ id: 'user-1' });
    await apiClient.auth.logout();
    await expect(apiClient.auth.updateMe({ name: 'Updated' })).resolves.toEqual({
      id: 'user-1',
      name: 'Updated'
    });

    expect(authMock.signOut).toHaveBeenCalled();
  });

  it('invokes mapped functions', async () => {
    functionsMock.testFn.mockResolvedValue({ ok: true });

    await expect(apiClient.functions.invoke('testFn', { hello: 'world' })).resolves.toEqual({ ok: true });
    expect(functionsMock.testFn).toHaveBeenCalledWith({ hello: 'world' });
  });
});
