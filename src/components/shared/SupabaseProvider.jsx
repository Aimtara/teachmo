import React, { createContext, useContext, useEffect, useState } from 'react';
import { createLogger } from '@/utils/logger';
import { getSupabaseInitError, supabase, isSupabaseConfigured } from '@/components/utils/supabase';

const logger = createLogger('supabase-provider');

const SupabaseContext = createContext({
  supabase: null,
  isConfigured: false,
  user: null,
  initError: null,
  loading: true,
});

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export function SupabaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();
  const initError = getSupabaseInitError();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        logger.error('Failed to get initial session', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const value = {
    supabase: isConfigured ? supabase : null,
    isConfigured,
    user,
    initError,
    loading,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export default SupabaseProvider;
