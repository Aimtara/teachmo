// Supabase client configuration
// Note: In production, these environment variables should be set in Base44 dashboard under Settings > Environment Variables

let supabase = null;

// Function to get environment variables in a browser-compatible way
const getEnvVar = (name) => {
  // Try different ways to access environment variables
  if (typeof window !== 'undefined') {
    // Browser environment - check window object first
    if (window.env && window.env[name]) {
      return window.env[name];
    }
    
    // Check for global variables that might be set by the bundler
    if (window[name]) {
      return window[name];
    }
  }
  
  // Try process.env if available (Node.js environment)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  
  return null;
};

// Initialize Supabase client only if environment variables are available
const initializeSupabase = async () => {
  try {
    // Try multiple environment variable naming conventions
    const supabaseUrl = getEnvVar('REACT_APP_SUPABASE_URL') || 
                       getEnvVar('VITE_SUPABASE_URL') || 
                       getEnvVar('SUPABASE_URL');
                       
    const supabaseAnonKey = getEnvVar('REACT_APP_SUPABASE_ANON_KEY') || 
                           getEnvVar('VITE_SUPABASE_ANON_KEY') || 
                           getEnvVar('SUPABASE_ANON_KEY');
    
    if (supabaseUrl && supabaseAnonKey) {
      try {
        // Dynamically import Supabase to avoid issues if not installed
        const { createClient } = await import('@supabase/supabase-js');
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('Supabase client initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize Supabase client:', error);
      }
    } else {
      console.warn('Supabase environment variables not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Base44 dashboard settings.');
    }
  } catch (error) {
    console.warn('Error during Supabase initialization:', error);
  }
};

// Initialize on import - but wrap in try/catch to prevent errors
try {
  initializeSupabase();
} catch (error) {
  console.warn('Failed to initialize Supabase on import:', error);
}

// Export the client and utility functions
export { supabase };

// Utility function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// Helper function to get Supabase client with error handling
export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }
  return supabase;
};

// Example usage functions for common operations
export const supabaseHelpers = {
  // Authentication helpers
  async signUp(email, password, options = {}) {
    const client = getSupabaseClient();
    return await client.auth.signUp({ email, password, options });
  },

  async signIn(email, password) {
    const client = getSupabaseClient();
    return await client.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    const client = getSupabaseClient();
    return await client.auth.signOut();
  },

  async getCurrentUser() {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    return user;
  },

  // Database helpers
  async insertData(table, data) {
    const client = getSupabaseClient();
    return await client.from(table).insert(data);
  },

  async selectData(table, filters = {}) {
    const client = getSupabaseClient();
    let query = client.from(table).select('*');
    
    // Apply filters if provided
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    return await query;
  },

  async updateData(table, id, updates) {
    const client = getSupabaseClient();
    return await client.from(table).update(updates).eq('id', id);
  },

  async deleteData(table, id) {
    const client = getSupabaseClient();
    return await client.from(table).delete().eq('id', id);
  },

  // Storage helpers
  async uploadFile(bucket, path, file) {
    const client = getSupabaseClient();
    return await client.storage.from(bucket).upload(path, file);
  },

  async downloadFile(bucket, path) {
    const client = getSupabaseClient();
    return await client.storage.from(bucket).download(path);
  },

  async getPublicUrl(bucket, path) {
    const client = getSupabaseClient();
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
};
