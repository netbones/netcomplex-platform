import { createClient } from '@supabase/supabase-js';
import { logError } from '@shared/lib';

// Validate required environment variables at startup
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
  logError({ component: 'supabase', operation: 'init' }, errorMsg);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
}

/** Supabase project URL from environment variables */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
/** Supabase anonymous key for client-side operations */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

/**
 * Supabase client instance for real-time subscriptions and database operations.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
