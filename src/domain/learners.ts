import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/services/core/client';
import { createEntityBridge } from './entityBridge';

type ListableEntity<T> = {
  list: (sort?: string) => Promise<T[] | null | undefined>;
};

const childEntity = {
  list: (sort = '-created_date') => apiClient.entity.list('Child', sort)
} as ListableEntity<unknown>;

export const learnersApi = {
  child: childEntity,
  student: createEntityBridge('Student'),
  studentParentLink: createEntityBridge('StudentParentLink'),
  enrollment: createEntityBridge('Enrollment'),
  userProfile: createEntityBridge('UserProfile')
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
