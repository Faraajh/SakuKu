import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

// Helper to get credentials from Env or LocalStorage
export const getCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  const localUrl = localStorage.getItem('sakuku_supabase_url');
  const localKey = localStorage.getItem('sakuku_supabase_key');

  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, source: 'local' };
  }

  return null;
};

// Initialize Supabase Client
export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;

  const credentials = getCredentials();
  if (!credentials) return null;

  try {
    supabaseInstance = createClient(credentials.url, credentials.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};

// Configure credentials manually from settings UI
export const initSupabase = (url, key) => {
  if (!url || !key) return false;
  
  localStorage.setItem('sakuku_supabase_url', url.trim());
  localStorage.setItem('sakuku_supabase_key', key.trim());
  
  // Reset instance to force re-initialization
  supabaseInstance = null;
  
  const client = getSupabaseClient();
  return client !== null;
};

// Clear manual credentials
export const clearSupabaseCredentials = () => {
  localStorage.removeItem('sakuku_supabase_url');
  localStorage.removeItem('sakuku_supabase_key');
  supabaseInstance = null;
};

// Check if configured
export const isSupabaseConfigured = () => {
  return getCredentials() !== null;
};
