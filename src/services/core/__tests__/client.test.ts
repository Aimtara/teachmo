import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44/client', () => ({
  base44: {
    auth: {
      me: vi.fn(),
      logout: vi.fn(),
      updateMe: vi.fn(),
    },
    entities: {
      Sample: {
        list: vi.fn(),
        filter: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

import { apiClient } from '../client';
import { base44 } from '@/api/base44/client';

describe('apiClient', () => {
  it('wraps entity list and filter', async () => {
    const list = base44.entities.Sample.list as unknown as ReturnType<typeof vi.fn>;
    const filter = base44.entities.Sample.filter as unknown as ReturnType<typeof vi.fn>;

    list.mockResolvedValue([{ id: 'one' }]);
    filter.mockResolvedValue([{ id: 'two' }]);

    await expect(apiClient.entity.list('Sample')).resolves.toEqual([{ id: 'one' }]);
    await expect(apiClient.entity.filter('Sample')).resolves.toEqual([{ id: 'two' }]);
  });

  it('wraps auth methods', async () => {
    const me = base44.auth.me as unknown as ReturnType<typeof vi.fn>;
    const logout = base44.auth.logout as unknown as ReturnType<typeof vi.fn>;
    const updateMe = base44.auth.updateMe as unknown as ReturnType<typeof vi.fn>;

    me.mockResolvedValue({ id: 'user-1' });
    updateMe.mockResolvedValue({ id: 'user-1', name: 'Updated' });

    await expect(apiClient.auth.me()).resolves.toEqual({ id: 'user-1' });
    await apiClient.auth.logout();
    await expect(apiClient.auth.updateMe({ name: 'Updated' })).resolves.toEqual({
      id: 'user-1',
      name: 'Updated',
    });

    expect(logout).toHaveBeenCalled();
  });
});
