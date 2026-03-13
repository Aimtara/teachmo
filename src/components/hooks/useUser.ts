import { useEffect, useState } from 'react';
import backendAdapter from '@/backend/adapter';
import type { BackendUser } from '@/backend/types';

export const useUser = () => {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await backendAdapter.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setError(err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUser();
  }, []);

  return { user, isLoading, error };
};
