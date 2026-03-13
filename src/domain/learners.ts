import { useCallback, useEffect, useState } from 'react';
import { base44Entities } from '@/api/base44';

type AnyRecord = Record<string, unknown>;
type ListableEntity<T> = {
  list: (sort?: string) => Promise<T[] | null | undefined>;
};

const entities = base44Entities as AnyRecord;
const childEntity = entities.Child as ListableEntity<unknown>;

export const learnersApi = {
  child: childEntity,
  student: entities.Student,
  studentParentLink: entities.StudentParentLink,
  enrollment: entities.Enrollment,
  userProfile: entities.UserProfile
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
