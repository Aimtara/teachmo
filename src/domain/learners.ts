import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/services/core/client';

type ListableEntity<T> = {
  list: (sort?: string) => Promise<T[] | null | undefined>;
};

const childEntity = {
  list: (sort = '-created_date') => apiClient.entity.list('Child', { sort })
} as ListableEntity<unknown>;

const entity = (name: string) => ({
  list: (params?: Record<string, unknown>) => apiClient.entity.list(name, params),
  filter: (params?: Record<string, unknown>) => apiClient.entity.filter(name, params),
  get: (id: string) => apiClient.entity.get(name, id),
  create: (payload: Record<string, unknown>) => apiClient.entity.create(name, payload),
  update: (id: string, payload: Record<string, unknown>) => apiClient.entity.update(name, id, payload),
  delete: (id: string) => apiClient.entity.delete(name, id)
});

export const learnersApi = {
  child: childEntity,
  student: entity('Student'),
  studentParentLink: entity('StudentParentLink'),
  enrollment: entity('Enrollment'),
  userProfile: entity('UserProfile')
};

export function useChildrenList(sort = '-created_date') {
  const [children, setChildren] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await learnersApi.child.list(sort);
      setChildren(results ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { children, refresh, isLoading, error };
}
