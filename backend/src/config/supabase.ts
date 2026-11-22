import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Regular client for user operations (token validation, etc.)
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Admin client for admin operations (creating users, etc.)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Client for token validation (uses anon key but can validate user tokens)
export const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});