import { createClient } from '@supabase/supabase-js';
import { logError } from '@shared/lib';

// Validate required environment variables at startup.
// Supabase recently renamed the anon key to "publishable key" (sb_publishable_...).
// Accept either the old (NEXT_PUBLIC_SUPABASE_ANON_KEY) or new
// (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) name.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingEnvVars: string[] = [];
if (!supabaseUrl) missingEnvVars.push('NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseAnonKey) {
  missingEnvVars.push(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)'
  );
}

if (missingEnvVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
  logError({ component: 'supabase', operation: 'init' }, errorMsg);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  }
}

/**
 * Supabase client instance for real-time subscriptions and database operations.
 * Accepts either the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY or the newer
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (sb_publishable_... format).
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
