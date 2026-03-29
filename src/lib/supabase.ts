import { createClient } from '@supabase/supabase-js';

/** Supabase project URL from environment variables */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
/** Supabase anonymous key for client-side operations */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client instance for real-time subscriptions and database operations.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
