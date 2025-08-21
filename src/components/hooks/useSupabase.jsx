
import { useSupabase } from '@/components/shared/SupabaseProvider';
import { supabaseHelpers } from '@/components/utils/supabase';

// Custom hook for easy Supabase operations
export function useSupabaseOperations() {
  const { supabase, isConfigured, user } = useSupabase();

  // Authentication operations
  const auth = {
    signUp: async (email, password, options = {}) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.signUp(email, password, options);
    },

    signIn: async (email, password) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.signIn(email, password);
    },

    signOut: async () => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.signOut();
    },

    getCurrentUser: () => user,
  };

  // Database operations
  const db = {
    insert: async (table, data) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.insertData(table, data);
    },

    select: async (table, filters = {}) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.selectData(table, filters);
    },

    update: async (table, id, updates) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.updateData(table, id, updates);
    },

    delete: async (table, id) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.deleteData(table, id);
    },
  };

  // Storage operations
  const storage = {
    upload: async (bucket, path, file) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.uploadFile(bucket, path, file);
    },

    download: async (bucket, path) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.downloadFile(bucket, path);
    },

    getPublicUrl: async (bucket, path) => {
      if (!isConfigured) throw new Error('Supabase not configured');
      return await supabaseHelpers.getPublicUrl(bucket, path);
    },
  };

  return {
    supabase,
    isConfigured,
    user,
    auth,
    db,
    storage,
  };
}

export default useSupabase;
