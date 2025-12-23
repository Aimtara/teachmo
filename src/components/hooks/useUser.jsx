import { useState, useEffect } from 'react';
import backendAdapter from '@/backend/adapter';

export const useUser = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

    fetchUser();
  }, []);

  return { user, isLoading, error };
};
