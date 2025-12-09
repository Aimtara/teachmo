import { useCallback, useEffect, useState } from 'react';
import { base44Entities } from '@/api/base44';

const { Child, Student, StudentParentLink, Enrollment, UserProfile } = base44Entities;

export const learnersApi = {
  child: Child,
  student: Student,
  studentParentLink: StudentParentLink,
  enrollment: Enrollment,
  userProfile: UserProfile
};

export function useChildrenList(sort = '-created_date') {
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    refresh();
  }, [refresh]);

  return { children, refresh, isLoading, error };
}
