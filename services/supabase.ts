import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database/types.ts';

/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client using environment variables.
 * The Supabase URL and anon key are stored securely in environment variables
 * to prevent exposure in the frontend code.
 * 
 * Security Note: The anon key is safe to use in the frontend as it's restricted
 * by Row Level Security (RLS) policies in Supabase. Never expose the service_role key.
 */

// Get environment variables
// In Vite, environment variables must be prefixed with VITE_ to be exposed to the client
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Validate that required environment variables are set
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please check your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please check your .env file.');
}

/**
 * Create and export the Supabase client with TypeScript types
 * This client is used throughout the application to interact with Supabase services
 * including authentication, database queries, and real-time subscriptions.
 * 
 * The Database type provides full type safety for all database operations.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refresh the session before it expires
    autoRefreshToken: true,
    // Persist the session in localStorage
    persistSession: true,
    // Detect when the session is available from another tab/window
    detectSessionInUrl: true,
  },
});

/**
 * Helper function to check if Supabase is properly configured
 * Useful for debugging and ensuring the client is ready before use
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

